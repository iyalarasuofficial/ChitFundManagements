// contributions.controller.ts

import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { calculatePenalty } from '../utils/helper';

const isGroupLifecycleCompleted = (group: { status: string; currentCycle: number; totalMembers: number }) => {
  return group.status === 'completed' || group.currentCycle > group.totalMembers;
};

export const listDues = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const rawGroupId = req.params.groupId;
    const hasGroupFilter = rawGroupId !== undefined && rawGroupId !== null && rawGroupId !== '';

    let groupId: number | undefined;
    if (hasGroupFilter) {
      const parsed = Number(rawGroupId);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return res.status(400).json({ error: 'Invalid group id' });
      }
      groupId = parsed;
    }

    let whereClause: any;

    if (groupId) {
      const group = await prisma.chitGroup.findUnique({
        where: { id: groupId },
        select: { id: true, createdBy: true }
      });

      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      const membership = await prisma.groupMember.findFirst({
        where: { groupId, userId, status: 'active' },
        select: { id: true }
      });
      const isOrganizer = group.createdBy === userId;
      if (!membership && !isOrganizer) {
        return res.status(403).json({ error: 'You are not a member of this group' });
      }

      // Group view should show only the logged-in user's contributions.
      whereClause = { member: { userId, groupId } };
    } else {
      // Without group filter, return only open dues for the logged-in user.
      whereClause = {
        member: { userId },
        status: { in: ['pending', 'partial', 'arrear', 'late'] }
      };
    }

    const dues = await prisma.contribution.findMany({
      where: whereClause,
      include: {
        member: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true
              }
            },
            group: {
              select: {
                id: true,
                name: true,
                status: true,
                currentCycle: true
              }
            }
          }
        }
      },
      orderBy: [
        { cycleNumber: 'asc' },
        { dueDate: 'asc' }
      ]
    });

    res.json({ dues, contributions: dues });
  } catch (error) {
    console.error('List dues error:', error);
    res.status(500).json({ error: 'List dues failed' });
  }
};

export const getContributionById = async (req: Request, res: Response) => {
  try {
    const contributionId = Number(req.params.id);
    if (!Number.isInteger(contributionId) || contributionId <= 0) {
      return res.status(400).json({ error: 'Invalid contribution id' });
    }

    const contribution = await prisma.contribution.findUnique({
      where: { id: contributionId },
      include: {
        member: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true
              }
            },
            group: {
              select: {
                id: true,
                name: true,
                createdBy: true,
                contributionAmount: true,
                currentCycle: true,
                status: true
              }
            }
          }
        }
      }
    });

    if (!contribution) {
      return res.status(404).json({ error: 'Contribution not found' });
    }

    const isOwner = contribution.member.userId === req.user!.userId;
    const isOrganizer = contribution.member.group.createdBy === req.user!.userId;

    if (!isOwner && !isOrganizer) {
      return res.status(403).json({ error: 'Not authorized to view this contribution' });
    }

    return res.json({ contribution });
  } catch (error) {
    return res.status(500).json({ error: 'Get contribution failed' });
  }
};

export const recordPayment = async (req: Request, res: Response) => {
  try {
    const contributionId = Number(req.params.id);
    if (!Number.isInteger(contributionId) || contributionId <= 0) {
      return res.status(400).json({ error: 'Invalid contribution id' });
    }
    const amount = Number(req.body?.amount);
    const paymentMethod = req.body?.paymentMethod || 'wallet';
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be a positive number' });
    }
    const contribution = await prisma.contribution.findUnique({
      where: { id: contributionId }
    });
    if (!contribution) {
      return res.status(404).json({ error: 'Contribution not found' });
    }

    // Authorization: only the member themselves or the group organizer can record payment
    const member = await prisma.groupMember.findUnique({
      where: { id: contribution.groupMemberId }
    });
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    const group = await prisma.chitGroup.findUnique({ where: { id: member.groupId } });
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (isGroupLifecycleCompleted(group)) {
      return res.status(400).json({ error: 'Group has completed all cycles. Payment is not allowed.' });
    }

    if (member.userId !== req.user!.userId && group.createdBy !== req.user!.userId) {
      return res.status(403).json({ error: 'Not authorized to record this payment' });
    }

    // Auto-penalty: if dueDate exists and payment is late, calculate penalty
    let autopenalty = 0;
    if (contribution.dueDate && new Date() > contribution.dueDate && contribution.status !== 'late') {
      const daysLate = Math.ceil((Date.now() - contribution.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      autopenalty = calculatePenalty(contribution.amountDue, daysLate);
    }

    // Total due includes existing penalties plus any auto-penalty
    const totalDue = contribution.adjustedDue + contribution.penaltyAmount + autopenalty;
    const newPaid = contribution.amountPaid + amount;
    
    if (newPaid > totalDue) {
      return res.status(400).json({ error: 'Overpayment not allowed' });
    }

    const isPaid = newPaid >= totalDue;
    const status = isPaid ? 'paid' : (autopenalty > 0 ? 'late' : 'partial');

    const walletDebit = amount + autopenalty;
    const payer = await prisma.user.findUnique({
      where: { id: member.userId },
      select: { walletBalance: true }
    });

    if (!payer) {
      return res.status(404).json({ error: 'Payer not found' });
    }

    if (payer.walletBalance < walletDebit) {
      return res.status(400).json({
        error: 'Insufficient money in wallet. Add money to wallet before payment.',
        walletBalance: payer.walletBalance,
        requiredAmount: walletDebit
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const contributionUpdated = await tx.contribution.update({
        where: { id: contributionId },
        data: {
          amountPaid: newPaid,
          paymentDate: new Date(),
          status,
          paymentMethod,
          penaltyAmount: autopenalty > 0 ? { increment: autopenalty } : undefined
        }
      });

      if (contribution.isArrear) {
        const nextArrears = Math.max((member.arrearsAmount || 0) - amount, 0);
        await tx.groupMember.update({
          where: { id: member.id },
          data: { arrearsAmount: nextArrears }
        });
      }

      await tx.user.update({
        where: { id: member.userId },
        data: { walletBalance: { decrement: walletDebit } }
      });

      // Only current-cycle regular contributions should feed auction pot.
      if (contribution.cycleNumber === group.currentCycle && !contribution.isArrear) {
        await tx.chitGroup.update({
          where: { id: member.groupId },
          data: { currentPotAmount: { increment: amount + autopenalty } }
        });
      }

      return contributionUpdated;
    });

    res.json({
      message: 'Payment recorded',
      updated,
      ...(autopenalty > 0 && { autoPenaltyApplied: autopenalty })
    });
  } catch (error) {
    res.status(500).json({ error: 'Record payment failed' });
  }
};

export const applyPenalty = async (req: Request, res: Response) => {
  try {
    const contributionId = Number(req.params.id);
    if (!Number.isInteger(contributionId) || contributionId <= 0) {
      return res.status(400).json({ error: 'Invalid contribution id' });
    }
    const { daysLate } = req.body;  // Organizer inputs daysLate or calculate from paymentDate

    const contribution = await prisma.contribution.findUnique({
      where: { id: contributionId }
    });
    if (!contribution) {
      return res.status(404).json({ error: 'Contribution not found' });
    }

    // Check if organizer (assume auth middleware is used, but add role check if needed)
    const member = await prisma.groupMember.findUnique({
      where: { id: contribution.groupMemberId }
    });
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    const group = await prisma.chitGroup.findUnique({ where: { id: member.groupId } });
    if (!group || group.createdBy !== req.user!.userId) {
      return res.status(403).json({ error: 'Only organizer can apply penalties' });
    }

    if (isGroupLifecycleCompleted(group)) {
      return res.status(400).json({ error: 'Group has completed all cycles. Penalties cannot be applied.' });
    }

    const penalty = calculatePenalty(contribution.amountDue, daysLate);

    const updated = await prisma.contribution.update({
      where: { id: contributionId },
      data: {
        penaltyAmount: { increment: penalty },
        status: 'late'
      }
    });

    // Add penalty to pot only for current-cycle regular contributions.
    if (contribution.cycleNumber === group.currentCycle && !contribution.isArrear) {
      await prisma.chitGroup.update({
        where: { id: member.groupId },
        data: { currentPotAmount: { increment: penalty } }
      });
    }

    // Simple defaulting rule: mark member defaulted after 3 or more late contributions
    const lateCount = await prisma.contribution.count({
      where: {
        groupMemberId: member.id,
        status: 'late'
      }
    });
    if (lateCount >= 3 && member.status !== 'defaulted') {
      await prisma.groupMember.update({
        where: { id: member.id },
        data: { status: 'defaulted' }
      });
    }

    res.json({ message: 'Penalty applied', updated, penaltyAdded: penalty });
  } catch (error) {
    res.status(500).json({ error: 'Apply penalty failed' });
  }
};