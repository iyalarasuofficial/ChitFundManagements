// dashboard.controller.ts

import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { calculateRisk } from '../utils/helper';

export const organizerDashboard = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const groups = await prisma.chitGroup.findMany({
      where: { createdBy: userId },
      include: {
        groupMembers: {
          include: { user: { select: { name: true, phone: true } } }
        }
      }
    });

    const data = await Promise.all(groups.map(async (group) => {
      const activeMembers = group.groupMembers.filter(m => m.status === 'active');
      const defaultedCount = group.groupMembers.filter(m => m.status === 'defaulted').length;

      // Current cycle contributions
      const contributions = await prisma.contribution.findMany({
        where: { member: { groupId: group.id }, cycleNumber: group.currentCycle },
        include: { member: { include: { user: { select: { name: true, phone: true } } } } }
      });

      const totalCollected = contributions.reduce((sum, c) => sum + c.amountPaid, 0);
      const totalDue = contributions.reduce((sum, c) => sum + c.adjustedDue, 0);
      const totalPenalty = contributions.reduce((sum, c) => sum + c.penaltyAmount, 0);

      const memberPaymentStatus = contributions.map(c => {
        const unpaidAmount = Math.max((c.adjustedDue + c.penaltyAmount) - c.amountPaid, 0);

        return {
          memberId: c.member.id,
          memberName: c.member.user.name,
          memberPhone: c.member.user.phone,
          amountDue: c.adjustedDue,
          amountPaid: c.amountPaid,
          unpaidAmount,
          status: c.status,
          penaltyAmount: c.penaltyAmount
        };
      });

      const unpaidMembers = memberPaymentStatus.filter(p => p.unpaidAmount > 0);

      return {
        groupId: group.id,
        name: group.name,
        status: group.status,
        chitValue: group.contributionAmount * group.totalMembers,
        currentCycle: group.currentCycle,
        durationMonths: group.durationMonths,
        totalMembers: group.totalMembers,
        activeMemberCount: activeMembers.length,
        defaultedCount,
        potAmount: group.currentPotAmount,
        organizerEarnings: group.organizerEarnings,
        collectionProgress: {
          collected: totalCollected,
          totalDue,
          percent: totalDue > 0 ? Math.round((totalCollected / totalDue) * 100) : 0
        },
        dueSummary: {
          totalDue,
          totalCollected,
          totalPenalty,
          totalUnpaid: unpaidMembers.reduce((sum, p) => sum + p.unpaidAmount, 0),
          unpaidMembersCount: unpaidMembers.length
        },
        memberPaymentStatus,
        unpaidMembers,
        riskScores: activeMembers.map(m => ({
          memberId: m.id,
          name: m.user.name,
          risk: calculateRisk(m)
        }))
      };
    }));

    const overall = data.reduce((acc, group) => {
      acc.totalGroups += 1;
      acc.totalDue += group.dueSummary.totalDue;
      acc.totalCollected += group.dueSummary.totalCollected;
      acc.totalPenalty += group.dueSummary.totalPenalty;
      acc.totalUnpaid += group.dueSummary.totalUnpaid;
      acc.unpaidMembersCount += group.dueSummary.unpaidMembersCount;
      return acc;
    }, {
      totalGroups: 0,
      totalDue: 0,
      totalCollected: 0,
      totalPenalty: 0,
      totalUnpaid: 0,
      unpaidMembersCount: 0
    });

    res.json({
      groups: data,
      overall: {
        ...overall,
        collectionPercent: overall.totalDue > 0
          ? Math.round((overall.totalCollected / overall.totalDue) * 100)
          : 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Organizer dashboard failed' });
  }
};


export const memberDashboard = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const memberships = await prisma.groupMember.findMany({
      where: { userId, status: 'active' },
      include: {
        user: { select: { walletBalance: true } },
        group: true,
        contributions: { orderBy: { cycleNumber: 'desc' } }
      }
    });

    const data = await Promise.all(memberships.map(async (m) => {
      const currentContribution = m.contributions.find(c => c.cycleNumber === m.group.currentCycle);
      const arrearContributions = m.contributions.filter(
        c => c.isArrear && c.status !== 'paid'
      );
      const computedArrearsAmount = arrearContributions.reduce(
        (sum, c) => sum + Math.max((c.adjustedDue + c.penaltyAmount) - c.amountPaid, 0),
        0
      );
      const effectiveArrearsAmount = Math.max(computedArrearsAmount, m.arrearsAmount || 0);
      const totalPenalty = m.contributions.reduce((sum, c) => sum + c.penaltyAmount, 0);

      // Check if user won any auction in this group
      const auctionWin = await prisma.auction.findFirst({
        where: { groupId: m.groupId, winnerGroupMemberId: m.id, status: 'completed' },
        select: { cycleNumber: true, payoutAmount: true, discountAmount: true }
      });

      return {
        groupId: m.group.id,
        groupName: m.group.name,
        groupStatus: m.group.status,
        currentCycle: m.group.currentCycle,
        myRole: m.role,
        walletBalance: m.user.walletBalance,
        dividendCredit: m.dividendCredit,
        arrearsAmount: effectiveArrearsAmount,
        currentDue: currentContribution ? {
          adjustedDue: currentContribution.adjustedDue,
          amountPaid: currentContribution.amountPaid,
          status: currentContribution.status,
          dueDate: currentContribution.dueDate,
          penaltyAmount: currentContribution.penaltyAmount
        } : null,
        arrearCount: arrearContributions.length,
        totalPenalty,
        auctionWin: auctionWin ? {
          wonCycle: auctionWin.cycleNumber,
          payoutAmount: auctionWin.payoutAmount,
          discountGiven: auctionWin.discountAmount
        } : null,
        contributionHistory: m.contributions.slice(0, 10).map(c => ({
          id: c.id,
          cycleNumber: c.cycleNumber,
          amountDue: c.adjustedDue,
          amountPaid: c.amountPaid,
          status: c.status,
          isArrear: c.isArrear,
          penaltyAmount: c.penaltyAmount
        }))
      };
    }));

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Member dashboard failed' });
  }
};