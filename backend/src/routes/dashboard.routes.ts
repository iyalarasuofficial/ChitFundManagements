import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  organizerDashboard,
  memberDashboard
} from '../controllers/dashboard.controller';

const router = express.Router();

router.get('/organizer', authMiddleware, organizerDashboard);
router.get('/member', authMiddleware, memberDashboard);

export default router;

