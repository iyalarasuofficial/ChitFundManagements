import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  startAuction,
  placeBid,
  endAuction,
  getAuctionResults,
  getAuctionWinners
} from '../controllers/auctions.controller';

const router = express.Router();

// Auction results & history
router.get('/:groupId/results/:cycleNumber', authMiddleware, getAuctionResults);
router.get('/:groupId/winners', authMiddleware, getAuctionWinners);

// Organizer starts an auction for a group
router.post('/:groupId/start', authMiddleware, startAuction);

// Member places a bid in an auction
router.post('/:auctionId/bid', authMiddleware, placeBid);

// Organizer (or system) ends an auction
router.post('/:auctionId/end', authMiddleware, endAuction);

export default router;

