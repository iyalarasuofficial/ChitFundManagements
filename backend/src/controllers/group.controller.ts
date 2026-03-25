import { Request, Response } from 'express';
import { prisma } from '../config/db';

const isGroupLifecycleCompleted = (group: { status: string; currentCycle: number; totalMembers: number }) => {
  return group.status === 'completed' || group.currentCycle > group.totalMembers;
};


// =======================
// CREATE GROUP
// =======================
export const createGroup = async (req: Request, res: Response) => {
    try {
      const {
        name,
        contributionAmount,
        organizerFeePercent,
        startDate
      } = req.body;

      const derivedDurationMonths = 1;
  
      if (!name || !contributionAmount || !startDate) {
        return res.status(400).json({ error: 'name, contributionAmount, and startDate are required' });
      }

      if (contributionAmount <= 0) {
        return res.status(400).json({ error: 'Invalid group details' });
      }
  
      const result = await prisma.$transaction(async (tx) => {
        const group = await tx.chitGroup.create({
          data: {
            name,
            contributionAmount,
            durationMonths: derivedDurationMonths,
            organizerFeePercent: organizerFeePercent || 5,
            startDate: new Date(startDate),
            endDate: new Date(
              new Date(startDate).getTime() +
              derivedDurationMonths * 30 * 24 * 60 * 60 * 1000
            ),
            createdBy: req.user!.userId
            // totalMembers defaults to 1
          }
        });
  
        await tx.groupMember.create({
          data: {
            groupId: group.id,
            userId: req.user!.userId,
            role: 'organizer',
            status: 'active'
          }
        });
  
        return group;
      });
  
      res.json({ message: 'Group created', group: result });
    } catch (error) {
      console.error('Create group error:', error);
      res.status(500).json({ error: 'Create group failed' });
    }
  };



// =======================
// EDIT GROUP
// =======================
export const editGroup = async (req: Request, res: Response) => {
    try {
      const groupId = Number(req.params.groupId);
  
      const group = await prisma.chitGroup.findUnique({ where: { id: groupId } });
      if (!group || group.createdBy !== req.user!.userId) {
        return res.status(403).json({ error: 'Only organizer can edit group' });
      }

      if (isGroupLifecycleCompleted(group)) {
        return res.status(400).json({ error: 'Group has completed all cycles. Editing is not allowed.' });
      }
  
      // Only allow safe fields to be updated (totalMembers is auto-managed)
      const { name, contributionAmount, organizerFeePercent, startDate, endDate, status } = req.body;
      const safeUpdates: Record<string, any> = {};
      if (name !== undefined) safeUpdates.name = name;
      if (contributionAmount !== undefined) safeUpdates.contributionAmount = contributionAmount;
      if (organizerFeePercent !== undefined) safeUpdates.organizerFeePercent = organizerFeePercent;
      if (startDate !== undefined) safeUpdates.startDate = new Date(startDate);
      if (endDate !== undefined) safeUpdates.endDate = new Date(endDate);
      if (status !== undefined) safeUpdates.status = status;
  
      const updatedGroup = await prisma.chitGroup.update({
        where: { id: groupId },
        data: safeUpdates
      });

      // Auto-generate cycle 1 contributions when group is activated
      if (status === 'active' && group.status !== 'active') {
        const activeMembers = await prisma.groupMember.findMany({
          where: { groupId, status: 'active' }
        });

        const dueDate = new Date(updatedGroup.startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

        await Promise.all(
          activeMembers.map(member =>
            prisma.contribution.create({
              data: {
                groupMemberId: member.id,
                cycleNumber: 1,
                amountDue: updatedGroup.contributionAmount,
                adjustedDue: updatedGroup.contributionAmount,
                dueDate,
                status: 'pending'
              }
            })
          )
        );
      }
  
      res.json({ message: 'Group edited', group: updatedGroup });
    } catch (error) {
      console.error('Edit group error:', error);
      res.status(500).json({ error: 'Edit group failed' });
    }
  };



export const removeMember = async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.params.groupId);
    const memberId = Number(req.params.memberId);

    const group = await prisma.chitGroup.findUnique({ where: { id: groupId } });
    if (!group || group.createdBy !== req.user!.userId) {
      return res.status(403).json({ error: 'Only organizer can remove members' });
    }

    if (isGroupLifecycleCompleted(group)) {
      return res.status(400).json({ error: 'Group has completed all cycles. Members cannot be removed.' });
    }

    const member = await prisma.groupMember.findFirst({ where: { userId: memberId, groupId } });

    if (!member) {
      return res.status(404).json({ error: 'Member not found in this group' });
    }

    if (member.status === 'left' || member.status === 'replaced') {
      return res.status(400).json({ error: 'Member has already been removed' });
    }

    if (member.userId === group.createdBy) {
      return res.status(400).json({ error: 'Cannot remove the organizer' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.groupMember.update({
        where: { id: member.id },
        data: { status: 'left', leftAt: new Date() }
      });

      // Cancel all pending/arrear contributions
      await tx.contribution.updateMany({
        where: {
          groupMemberId: member.id,
          status: { in: ['pending', 'arrear'] }
        },
        data: { status: 'cancelled' }
      });

      // Decrement totalMembers
      await tx.chitGroup.update({
        where: { id: groupId },
        data: {
          totalMembers: { decrement: 1 },
          durationMonths: { decrement: 1 }
        }
      });

      // Remove bids from any running auction
      const runningAuction = await tx.auction.findFirst({
        where: { groupId, status: 'running' }
      });
      if (runningAuction) {
        await tx.bid.deleteMany({
          where: { auctionId: runningAuction.id, groupMemberId: member.id }
        });
      }
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Remove member failed' });
  }
};



// ======================
// ADD MEMBER
// ======================

export const addMember = async (req: Request, res: Response) => {
    try {
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: 'Request body is required' });
      }

      const groupId = Number(req.params.groupId);
      const { phone, isSubstitution, oldMemberId, suretyDetails } = req.body;
      const normalizedPhone = String(phone || '').trim();

      if (!phone) {
        return res.status(400).json({ error: 'phone is required in request body' });
      }

      if (!/^\d{10}$/.test(normalizedPhone)) {
        return res.status(400).json({ error: 'Phone must be a valid 10-digit number' });
      }
  
      // 1. Check if requester is organizer
      const group = await prisma.chitGroup.findUnique({ where: { id: groupId } });
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      if (isGroupLifecycleCompleted(group)) {
        return res.status(400).json({ error: 'Group has completed all cycles. Members cannot be added.' });
      }

      if (group.createdBy !== req.user!.userId) {
        return res.status(403).json({ error: 'Only organizer can add members' });
      }
      if (group.status !== 'pending' || group.currentCycle > 1) {
        return res.status(400).json({
          error: 'Adding members after the group starts is disabled'
        });
      }

      // 2. Find user by phone
      const user = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
      if (!user) {
        return res.status(404).json({ error: 'User not registered. Ask them to sign up first.' });
      }
  
      // 3. Check if user already exists in this group
      const existingMember = await prisma.groupMember.findFirst({
        where: { groupId, userId: user.id }
      });
  
      // If member previously left or was replaced, reactivate them
      if (existingMember) {
        if (existingMember.status === 'left' || existingMember.status === 'replaced') {
          const result = await prisma.$transaction(async (tx) => {
            const isMidCycle = group.currentCycle > 1;
            const arrears = isMidCycle ? (group.currentCycle - 1) * group.contributionAmount : 0;

            const reactivated = await tx.groupMember.update({
              where: { id: existingMember.id },
              data: { status: 'active', leftAt: null, arrearsAmount: arrears }
            });

            await tx.chitGroup.update({
              where: { id: groupId },
              data: {
                totalMembers: { increment: 1 },
                durationMonths: { increment: 1 }
              }
            });

            // Create arrear contributions for missed cycles
            if (isMidCycle) {
              for (let cycle = 1; cycle < group.currentCycle; cycle++) {
                await tx.contribution.create({
                  data: {
                    groupMemberId: existingMember.id,
                    cycleNumber: cycle,
                    amountDue: group.contributionAmount,
                    adjustedDue: group.contributionAmount,
                    status: 'arrear',
                    isArrear: true
                  }
                });
              }
            }

            // Create current cycle contribution if group is active and contributions exist
            if (group.status === 'active') {
              const existingCycleCont = await tx.contribution.findFirst({
                where: { member: { groupId }, cycleNumber: group.currentCycle }
              });
              const fallbackDueDate = new Date();
              fallbackDueDate.setDate(fallbackDueDate.getDate() + 30);

              await tx.contribution.create({
                data: {
                  groupMemberId: existingMember.id,
                  cycleNumber: group.currentCycle,
                  amountDue: group.contributionAmount,
                  adjustedDue: group.contributionAmount,
                  dueDate: existingCycleCont?.dueDate ?? fallbackDueDate,
                  status: 'pending'
                }
              });
            }

            return reactivated;
          });

          return res.json({ message: 'Member reactivated successfully', newMember: result });
        }
        return res.status(400).json({ error: 'User is already an active member of this group' });
      }
  
      // 4. Validate oldMemberId for substitutions
      let oldGroupMember: any = null;
      if (isSubstitution && oldMemberId) {
        oldGroupMember = await prisma.groupMember.findFirst({ where: { userId: Number(oldMemberId), groupId } });
        if (!oldGroupMember) {
          return res.status(400).json({ error: 'Old member not found in this group' });
        }
      }
  
      // 5. Use transaction for safety
      const isMidCycle = group.currentCycle > 1;
      const arrears = isMidCycle ? (group.currentCycle - 1) * group.contributionAmount : 0;

      const result = await prisma.$transaction(async (tx) => {
        const newMember = await tx.groupMember.create({
          data: {
            groupId: group.id,
            userId: user.id,
            role: 'member',
            status: 'active',
            arrearsAmount: arrears,
            suretyDetails: suretyDetails || null
          }
        });

        // Increment totalMembers
        await tx.chitGroup.update({
          where: { id: groupId },
          data: {
            totalMembers: { increment: 1 },
            durationMonths: { increment: 1 }
          }
        });

        // If substitution: mark old member as replaced
        if (isSubstitution && oldGroupMember) {
          await tx.groupMember.update({
            where: { id: oldGroupMember.id },
            data: { status: 'replaced', leftAt: new Date() }
          });
          // Substitution doesn't increment — old leaves, new joins (net 0)
          // But we already incremented above, so decrement for the old one
          await tx.chitGroup.update({
            where: { id: groupId },
            data: {
              totalMembers: { decrement: 1 },
              durationMonths: { decrement: 1 }
            }
          });
        }

        // Create arrear contributions for missed cycles
        if (isMidCycle) {
          for (let cycle = 1; cycle < group.currentCycle; cycle++) {
            await tx.contribution.create({
              data: {
                groupMemberId: newMember.id,
                cycleNumber: cycle,
                amountDue: group.contributionAmount,
                adjustedDue: group.contributionAmount,
                status: 'arrear',
                isArrear: true
              }
            });
          }
        }

        // Create current cycle contribution if group is active and contributions exist for this cycle
        if (group.status === 'active') {
          const existingCycleCont = await tx.contribution.findFirst({
            where: { member: { groupId }, cycleNumber: group.currentCycle }
          });
          const fallbackDueDate = new Date();
          fallbackDueDate.setDate(fallbackDueDate.getDate() + 30);

          await tx.contribution.create({
            data: {
              groupMemberId: newMember.id,
              cycleNumber: group.currentCycle,
              amountDue: group.contributionAmount,
              adjustedDue: group.contributionAmount,
              dueDate: existingCycleCont?.dueDate ?? fallbackDueDate,
              status: 'pending'
            }
          });
        }
  
        return newMember;
      });
  
      res.json({
        message: isSubstitution ? 'Member substituted successfully' : 'Member added successfully',
        newMember: result
      });
  
    } catch (error) {
      console.error('Add member error:', error);
      res.status(500).json({ error: 'Add member failed' });
    }
  };

// ARCHIVE GROUP
// =======================

export const archiveGroup = async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.params.groupId);

    const group = await prisma.chitGroup.findUnique({ where: { id: groupId } });
    if (!group || group.createdBy !== req.user!.userId) {
      return res.status(403).json({ error: 'Only organizer can archive group' });
    }

    const archived = await prisma.chitGroup.update({
      where: { id: groupId },
      data: {
        status: 'archived',
        endDate: group.endDate ?? new Date()
      }
    });

    return res.json({ message: 'Group archived', group: archived });
  } catch (error) {
    console.error('Archive group error:', error);
    return res.status(500).json({ error: 'Archive group failed' });
  }
};

// =======================
// ADVANCE CYCLE
// =======================
export const advanceCycle = async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.params.groupId);

    const group = await prisma.chitGroup.findUnique({ where: { id: groupId } });
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group.createdBy !== req.user!.userId) {
      return res.status(403).json({ error: 'Only organizer can advance cycle' });
    }

    if (group.status !== 'active') {
      return res.status(400).json({ error: 'Group must be active to advance cycle' });
    }

    if (group.currentCycle >= group.totalMembers) {
      return res.status(400).json({ error: 'Group has reached maximum cycles based on member count' });
    }

    // Check if there's a running auction for current cycle
    const runningAuction = await prisma.auction.findFirst({
      where: { groupId, cycleNumber: group.currentCycle, status: 'running' }
    });

    if (runningAuction) {
      return res.status(400).json({ error: 'Cannot advance cycle with running auction' });
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const result = await prisma.$transaction(async (tx) => {
      const newCycle = group.currentCycle + 1;
      const isCompleted = newCycle > group.totalMembers;

      // Increment current cycle, reset pot to 0
      const updatedGroup = await tx.chitGroup.update({
        where: { id: groupId },
        data: {
          currentCycle: newCycle,
          currentPotAmount: 0,
          status: isCompleted ? 'completed' : 'active'
        }
      });

      // Get all active members
      const activeMembers = await tx.groupMember.findMany({
        where: { groupId, status: 'active' }
      });

      // Create contributions with standard due amount.
      const contributions = await Promise.all(
        activeMembers.map(async (member) => {
          const contribution = await tx.contribution.create({
            data: {
              groupMemberId: member.id,
              cycleNumber: newCycle,
              amountDue: group.contributionAmount,
              adjustedDue: group.contributionAmount,
              amountPaid: 0,
              dueDate,
              status: 'pending'
            }
          });

          return contribution;
        })
      );

      return { group: updatedGroup, contributions };
    });

    return res.json({
      message: `Cycle advanced to ${result.group.currentCycle}`,
      group: result.group,
      contributionsCreated: result.contributions.length
    });
  } catch (error) {
    console.error('Advance cycle error:', error);
    return res.status(500).json({ error: 'Advance cycle failed' });
  }
};

// =======================
// GENERATE CONTRIBUTIONS
// =======================
export const generateContributions = async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.params.groupId);
    const { cycleNumber } = req.body;

    const group = await prisma.chitGroup.findUnique({ where: { id: groupId } });
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group.createdBy !== req.user!.userId) {
      return res.status(403).json({ error: 'Only organizer can generate contributions' });
    }

    const targetCycle = cycleNumber || group.currentCycle;

    // Check if contributions already exist for this cycle
    const existingContributions = await prisma.contribution.count({
      where: {
        member: { groupId },
        cycleNumber: targetCycle
      }
    });

    if (existingContributions > 0) {
      return res.status(400).json({
        error: `Contributions already exist for cycle ${targetCycle}`
      });
    }

    // Get all active members
    const activeMembers = await prisma.groupMember.findMany({
      where: { groupId, status: 'active' }
    });

    if (activeMembers.length === 0) {
      return res.status(400).json({ error: 'No active members in group' });
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Create contributions for all members
    const contributions = await prisma.$transaction(
      activeMembers.map(member =>
        prisma.contribution.create({
          data: {
            groupMemberId: member.id,
            cycleNumber: targetCycle,
            amountDue: group.contributionAmount,
            adjustedDue: group.contributionAmount,
            amountPaid: 0,
            dueDate,
            status: 'pending'
          }
        })
      )
    );

    return res.json({
      message: `Generated ${contributions.length} contributions for cycle ${targetCycle}`,
      contributions
    });
  } catch (error) {
    console.error('Generate contributions error:', error);
    return res.status(500).json({ error: 'Generate contributions failed' });
  }
};

// =======================
// LIST MY GROUPS
// =======================
export const listMyGroups = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Groups where user is a member (active)
    const memberships = await prisma.groupMember.findMany({
      where: { userId, status: 'active' },
      include: {
        group: {
          select: {
            id: true, name: true, contributionAmount: true,
            totalMembers: true, durationMonths: true, currentCycle: true,
            status: true, startDate: true, createdBy: true
          }
        }
      }
    });

    const groups = memberships.map(m => ({
      ...m.group,
      chitValue: m.group.contributionAmount * m.group.totalMembers,
      myRole: m.role,
      isOrganizer: m.group.createdBy === userId
    }));

    return res.json({ groups });
  } catch (error) {
    console.error('List my groups error:', error);
    return res.status(500).json({ error: 'Failed to list groups' });
  }
};

// =======================
// GET GROUP DETAIL
// =======================
export const getGroupDetail = async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.params.groupId);
    const userId = req.user!.userId;

    const group = await prisma.chitGroup.findUnique({
      where: { id: groupId },
      include: {
        groupMembers: {
          where: { status: 'active' },
          include: { user: { select: { id: true, name: true, phone: true } } }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user is a member of this group
    const isMember = group.groupMembers.some(m => m.userId === userId);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const isOrganizer = group.createdBy === userId;

    return res.json({
      group: {
        id: group.id,
        name: group.name,
        chitValue: group.contributionAmount * group.totalMembers,
        contributionAmount: group.contributionAmount,
        totalMembers: group.totalMembers,
        durationMonths: group.durationMonths,
        currentCycle: group.currentCycle,
        currentPotAmount: group.currentPotAmount,
        status: group.status,
        startDate: group.startDate,
        organizerEarnings: isOrganizer ? group.organizerEarnings : undefined,
        memberCount: group.groupMembers.length,
        members: group.groupMembers.map(m => ({
          id: m.id,
          userId: m.userId,
          name: m.user.name,
          phone: m.user.phone,
          role: m.role,
          joinedAt: m.joinedAt,
          dividendCredit: m.dividendCredit,
          arrearsAmount: m.arrearsAmount
        }))
      },
      isOrganizer
    });
  } catch (error) {
    console.error('Get group detail error:', error);
    return res.status(500).json({ error: 'Failed to get group details' });
  }
};

// =======================
// LIST GROUP MEMBERS
// =======================
export const listGroupMembers = async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.params.groupId);
    const userId = req.user!.userId;

    // Verify user belongs to the group
    const myMembership = await prisma.groupMember.findFirst({
      where: { groupId, userId, status: 'active' }
    });
    if (!myMembership) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true, phone: true } } },
      orderBy: { joinedAt: 'asc' }
    });

    return res.json({
      members: members.map(m => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        phone: m.user.phone,
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt,
        leftAt: m.leftAt,
        dividendCredit: m.dividendCredit,
        arrearsAmount: m.arrearsAmount
      }))
    });
  } catch (error) {
    console.error('List group members error:', error);
    return res.status(500).json({ error: 'Failed to list members' });
  }
};