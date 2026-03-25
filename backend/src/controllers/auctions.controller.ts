import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { io } from '../server';

const isGroupLifecycleCompleted = (group: { status: string; currentCycle: number; totalMembers: number }) => {
  return group.status === 'completed' || group.currentCycle > group.totalMembers;
};


export const startAuction = async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.params.groupId);
    const group = await prisma.chitGroup.findUnique({ where: { id: groupId } });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (isGroupLifecycleCompleted(group)) {
      return res.status(400).json({ error: 'Group has completed all cycles. No further operations are allowed.' });
    }

    if (group.createdBy !== req.user!.userId) {
      return res.status(403).json({ error: 'Only organizer can start auction' });
    }

    // Check if auction already running for this cycle
    const existingAuction = await prisma.auction.findFirst({
      where: { groupId, cycleNumber: group.currentCycle, status: 'running' }
    });

    if (existingAuction) {
      return res.status(400).json({ error: 'Auction already running for this cycle' });
    }

    const activeMembersCount = await prisma.groupMember.count({
      where: { groupId, status: 'active' }
    });

    if (activeMembersCount <= 0) {
      return res.status(400).json({ error: 'No active members available to start auction' });
    }

    const cyclePot = await prisma.contribution.aggregate({
      where: {
        member: { groupId },
        cycleNumber: group.currentCycle,
        isArrear: false
      },
      _sum: { amountPaid: true }
    });

    const collectedPotAmount = cyclePot._sum.amountPaid ?? 0;
    const requiredPotAmount = activeMembersCount * group.contributionAmount;

    if (collectedPotAmount <= 0) {
      return res.status(400).json({
        error: 'Cannot start auction. Pot amount is 0 for current cycle.',
        collectedPotAmount,
        requiredPotAmount
      });
    }

    if (collectedPotAmount < requiredPotAmount) {
      return res.status(400).json({
        error: `Cannot start auction. Minimum required pot is ${requiredPotAmount}.`,
        collectedPotAmount,
        requiredPotAmount
      });
    }

    const auction = await prisma.auction.create({
      data: {
        groupId,
        cycleNumber: group.currentCycle,
        startTime: new Date(),
        endTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes auction
        status: 'running'
      }
    });

    // Notify all members in the group via Socket.io
    io.of("/auction").to(groupId.toString()).emit("auctionStarted", {
      auctionId: auction.id,
      groupId,
      cycleNumber: auction.cycleNumber,
      startTime: auction.startTime,
      endTime: auction.endTime
    });

    return res.json({ message: 'Auction started', auction });
  } catch (error) {
    console.error('Start auction error:', error);
    return res.status(500).json({ error: 'Start auction failed' });
  }
};

// Place Bid (member only)
export const placeBid = async (req: Request, res: Response) => {
  try {
    const auctionId = Number(req.params.auctionId);
    const { discount } = req.body;

    if (!discount || discount <= 0) {
      return res.status(400).json({ error: 'Invalid discount amount' });
    }

    const auction = await prisma.auction.findUnique({ 
      where: { id: auctionId },
      include: { group: true }
    });
    
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    if (isGroupLifecycleCompleted(auction.group)) {
      return res.status(400).json({ error: 'Group has completed all cycles. Bidding is not allowed.' });
    }

    if (auction.status !== 'running') {
      return res.status(400).json({ error: 'Auction not running' });
    }

    if (new Date() > auction.endTime) {
      return res.status(400).json({ error: 'Auction has ended' });
    }

    const cyclePot = await prisma.contribution.aggregate({
      where: {
        member: { groupId: auction.groupId },
        cycleNumber: auction.cycleNumber,
        isArrear: false
      },
      _sum: { amountPaid: true }
    });
    const collectedCyclePot = cyclePot._sum.amountPaid ?? 0;

    // Validate discount doesn't exceed current cycle regular-contribution pot.
    if (discount >= collectedCyclePot) {
      return res.status(400).json({ error: 'Discount cannot exceed pot amount' });
    }

    // Get group member
    const groupMember = await prisma.groupMember.findFirst({
      where: { userId: req.user!.userId, groupId: auction.groupId }
    });

    if (!groupMember) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    if (groupMember.status !== 'active') {
      return res.status(403).json({ error: 'Only active members can bid' });
    }

    // Check if member already won in a previous auction
    const previousWin = await prisma.auction.findFirst({
      where: {
        groupId: auction.groupId,
        winnerGroupMemberId: groupMember.id,
        status: 'completed'
      }
    });

    if (previousWin) {
      return res.status(403).json({ 
        error: 'You have already won an auction in this group',
        wonCycle: previousWin.cycleNumber
      });
    }

    const bid = await prisma.bid.create({
      data: {
        auctionId,
        groupMemberId: groupMember.id,
        bidAmount: discount
      }
    });

    // Broadcast new bid live to all in auction room
    io.of('/auction').to(auction.groupId.toString()).emit('newBid', {
      auctionId,
      userId: req.user!.userId,
      discount,
      timestamp: new Date().toISOString()
    });

    return res.json({ message: 'Bid placed successfully', bid });
  } catch (error) {
    console.error('Place bid error:', error);
    return res.status(500).json({ error: 'Place bid failed' });
  }
};

// End Auction (organizer or timer)
export const endAuction = async (req: Request, res: Response) => {
  try {
    const auctionId = Number(req.params.auctionId);

    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: { group: true, bids: true }
    });

    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    if (isGroupLifecycleCompleted(auction.group)) {
      return res.status(400).json({ error: 'Group has completed all cycles. Auction cannot be ended again.' });
    }

    if (auction.group.createdBy !== req.user!.userId) {
      return res.status(403).json({ error: 'Only organizer can end auction' });
    }

    if (auction.status !== 'running') {
      return res.status(400).json({ error: 'Auction already ended' });
    }

    // Get active members who haven't won yet
    const activeMembers = await prisma.groupMember.findMany({
      where: { groupId: auction.groupId, status: 'active' }
    });

    const previousWinnerIds = (await prisma.auction.findMany({
      where: { groupId: auction.groupId, status: 'completed', winnerGroupMemberId: { not: null } },
      select: { winnerGroupMemberId: true }
    })).map(a => a.winnerGroupMemberId);

    const eligibleForWin = activeMembers.filter(m => !previousWinnerIds.includes(m.id));

    // Last member auto-win: if only one eligible member left, they win with 0 discount
    let winnerMemberId: number;
    let discount: number;

    if (eligibleForWin.length === 1) {
      winnerMemberId = eligibleForWin[0].id;
      discount = 0;
    } else if (auction.bids.length === 0) {
      return res.status(400).json({ error: 'No bids placed and multiple members still eligible' });
    } else {
      // Find winner: highest discount bid wins
      const winnerBid = auction.bids.reduce((prev, current) =>
        prev.bidAmount > current.bidAmount ? prev : current
      );
      winnerMemberId = winnerBid.groupMemberId;
      discount = winnerBid.bidAmount;
    }

    const cyclePot = await prisma.contribution.aggregate({
      where: {
        member: { groupId: auction.groupId },
        cycleNumber: auction.cycleNumber,
        isArrear: false
      },
      _sum: { amountPaid: true }
    });
    const potAmount = cyclePot._sum.amountPaid ?? 0;
    const organizerFee = (auction.group.organizerFeePercent / 100) * potAmount;
    const payout = potAmount - discount - organizerFee;

    // Members who get dividend = active members except the winner
    const dividendRecipients = activeMembers.filter(m => m.id !== winnerMemberId);
    const dividendPerMember = dividendRecipients.length > 0 ? discount / dividendRecipients.length : 0;

    await prisma.$transaction(async (tx) => {
      const nextCycle = auction.group.currentCycle + 1;
      const isCompleted = nextCycle > auction.group.totalMembers;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      // Update auction
      await tx.auction.update({
        where: { id: auctionId },
        data: {
          status: 'completed',
          winnerGroupMemberId: winnerMemberId,
          discountAmount: discount,
          payoutAmount: payout,
          dividendPerMember
        }
      });


      // Credit payout to winner's wallet
      const winnerMember = activeMembers.find(m => m.id === winnerMemberId);
      if (winnerMember) {
        await tx.$executeRaw`
          UPDATE "User"
          SET "walletBalance" = "walletBalance" + ${payout}
          WHERE "id" = ${winnerMember.userId}
        `;
      }

      // Credit organizer fee to organizer wallet as usable balance.
      if (organizerFee > 0) {
        await tx.$executeRaw`
          UPDATE "User"
          SET "walletBalance" = "walletBalance" + ${organizerFee}
          WHERE "id" = ${auction.group.createdBy}
        `;
      }

      // Track organizer earnings and reset pot to 0
      await tx.chitGroup.update({
        where: { id: auction.groupId },
        data: {
          currentCycle: nextCycle,
          status: isCompleted ? 'completed' : 'active',
          currentPotAmount: 0,
          organizerEarnings: { increment: organizerFee }
        }
      });

      // Distribute dividend credit to non-winners
      for (const member of dividendRecipients) {
        await tx.$executeRaw`
          UPDATE "User"
          SET "walletBalance" = "walletBalance" + ${dividendPerMember}
          WHERE "id" = ${member.userId}
        `;
      }

      // Auto-create next-cycle contributions unless group has completed all cycles.
      if (!isCompleted) {
        for (const member of activeMembers) {
          await tx.contribution.create({
            data: {
              groupMemberId: member.id,
              cycleNumber: nextCycle,
              amountDue: auction.group.contributionAmount,
              adjustedDue: auction.group.contributionAmount,
              amountPaid: 0,
              dueDate,
              status: 'pending'
            }
          });
        }
      }
    });

    // Broadcast auction end
    io.of('/auction').to(auction.groupId.toString()).emit('auctionEnded', {
      auctionId,
      winner: { groupMemberId: winnerMemberId, discount },
      payout,
      organizerFee,
      dividendPerMember
    });

    return res.json({
      message: 'Auction ended successfully',
      winner: { groupMemberId: winnerMemberId, discount },
      payout,
      organizerFee,
      dividendPerMember
    });
  } catch (error) {
    console.error('End auction error:', error);
    return res.status(500).json({ error: 'End auction failed' });
  }
};

// =======================
// GET AUCTION RESULTS (for a specific cycle)
// =======================
export const getAuctionResults = async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.params.groupId);
    const cycleNumber = Number(req.params.cycleNumber);

    const auction = await prisma.auction.findFirst({
      where: { groupId, cycleNumber },
      include: {
        bids: {
          include: { member: { include: { user: { select: { name: true } } } } },
          orderBy: { bidAmount: 'desc' }
        },
        winner: { include: { user: { select: { name: true } } } }
      }
    });

    if (!auction) {
      return res.json({ auction: null, message: 'No auction found for this cycle yet' });
    }

    return res.json({
      auction: {
        id: auction.id,
        cycleNumber: auction.cycleNumber,
        status: auction.status,
        startTime: auction.startTime,
        endTime: auction.endTime,
        discountAmount: auction.discountAmount,
        payoutAmount: auction.payoutAmount,
        dividendPerMember: auction.dividendPerMember,
        winner: auction.winner ? { id: auction.winner.id, name: auction.winner.user.name } : null,
        bids: auction.bids.map(b => ({
          id: b.id,
          memberName: b.member.user.name,
          bidAmount: b.bidAmount,
          createdAt: b.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Get auction results error:', error);
    return res.status(500).json({ error: 'Failed to get auction results' });
  }
};

// =======================
// GET ALL AUCTION WINNERS (group history)
// =======================
export const getAuctionWinners = async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.params.groupId);

    const auctions = await prisma.auction.findMany({
      where: { groupId, status: 'completed' },
      include: {
        winner: { include: { user: { select: { name: true, phone: true } } } }
      },
      orderBy: { cycleNumber: 'asc' }
    });

    return res.json({
      winners: auctions.map(a => ({
        cycleNumber: a.cycleNumber,
        winnerName: a.winner?.user.name || 'N/A',
        winnerPhone: a.winner?.user.phone || 'N/A',
        discountAmount: a.discountAmount,
        payoutAmount: a.payoutAmount,
        dividendPerMember: a.dividendPerMember
      }))
    });
  } catch (error) {
    console.error('Get auction winners error:', error);
    return res.status(500).json({ error: 'Failed to get auction winners' });
  }
};