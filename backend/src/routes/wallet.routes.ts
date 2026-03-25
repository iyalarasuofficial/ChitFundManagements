import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { addFunds, getWalletBalance, withdrawFunds } from '../controllers/wallet.controller';

const router = express.Router();

router.get('/balance', authMiddleware, getWalletBalance);
router.post('/add-funds', authMiddleware, addFunds);
router.post('/withdraw', authMiddleware, withdrawFunds);

export default router;
