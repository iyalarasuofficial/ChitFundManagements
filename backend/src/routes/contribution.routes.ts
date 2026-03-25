import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  listDues,
  recordPayment,
  applyPenalty,getContributionById
} from '../controllers/contribution.controller';

const router = express.Router();

// List dues for a group
router.get('/:groupId/contributions', authMiddleware, listDues);
router.get('/contributions/:id', authMiddleware, getContributionById);

// Record a manual/UPI payment for a contribution
router.post('/contributions/:id/pay', authMiddleware, recordPayment);

// Apply a late penalty (organizer only)
router.post('/contributions/:id/penalty', authMiddleware, applyPenalty);

export default router;

