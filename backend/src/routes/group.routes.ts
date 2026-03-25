import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  createGroup,
  editGroup,
  archiveGroup,
  addMember,
  removeMember,
  advanceCycle,
  generateContributions,
  listMyGroups,
  getGroupDetail,
  listGroupMembers
} from '../controllers/group.controller';

const router = express.Router();

// Group listing & details
router.get('/', authMiddleware, listMyGroups);
router.get('/:groupId', authMiddleware, getGroupDetail);
router.get('/:groupId/members', authMiddleware, listGroupMembers);

// Group management
router.post('/', authMiddleware, createGroup);
router.put('/:groupId', authMiddleware, editGroup);
router.put('/:groupId/archive', authMiddleware, archiveGroup);

// Member management
router.post('/:groupId/members', authMiddleware, addMember);
router.delete('/:groupId/members/:memberId', authMiddleware, removeMember);

// Cycle management
router.post('/:groupId/advance-cycle', authMiddleware, advanceCycle);
router.post('/:groupId/generate-contributions', authMiddleware, generateContributions);

export default router;