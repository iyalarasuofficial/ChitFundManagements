import { Request, Response } from 'express';
import { prisma } from '../config/db';

export const getWalletBalance = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, walletBalance: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ walletBalance: user.walletBalance });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch wallet balance' });
  }
};

export const addFunds = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const amount = Number(req.body?.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { walletBalance: { increment: amount } },
      select: { walletBalance: true }
    });

    return res.json({
      message: 'Funds added successfully',
      walletBalance: updated.walletBalance
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to add funds' });
  }
};

export const withdrawFunds = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const amount = Number(req.body?.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.walletBalance < amount) {
      return res.status(400).json({
        error: 'Insufficient wallet balance',
        walletBalance: user.walletBalance,
        requiredAmount: amount
      });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { walletBalance: { decrement: amount } },
      select: { walletBalance: true }
    });

    return res.json({
      message: 'Withdrawal successful',
      walletBalance: updated.walletBalance
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to withdraw funds' });
  }
};
