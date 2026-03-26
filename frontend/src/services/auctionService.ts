import api from './api';
import { io } from 'socket.io-client';

const apiBaseUrl = import.meta.env.VITE_API_URL;
if (!apiBaseUrl) {
  throw new Error('VITE_API_URL is required. Set it in frontend environment variables.');
}

const defaultSocketOrigin = new URL(apiBaseUrl, window.location.origin).origin;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || defaultSocketOrigin;

export const auctionService = {
  // Get auction results by group + cycle
  getAuctionResultsByCycle: (groupId: string, cycleNumber: number) =>
    api.get(`/auctions/${groupId}/results/${cycleNumber}`),

  // Alias for existing page usage
  getGroupAuctions: async (groupId: string, cycleNumber?: number) => {
    if (!cycleNumber) return { data: [] as any[] };
    try {
      const response = await api.get(`/auctions/${groupId}/results/${cycleNumber}`);
      const auction = response.data.auction;
      return {
        data: [
          {
            id: String(auction.id),
            groupId,
            cycleNumber: auction.cycleNumber,
            winnerGroupMemberId: auction.winner?.id,
            discount: auction.discountAmount || 0,
            payout: auction.payoutAmount || 0,
            status: auction.status === 'running' ? 'active' : auction.status,
            startedAt: auction.startTime,
            endedAt: auction.endTime,
            createdAt: auction.startTime || new Date().toISOString(),
            updatedAt: auction.endTime || auction.startTime || new Date().toISOString(),
          },
        ],
      };
    } catch {
      return { data: [] as any[] };
    }
  },

  // Get bids for an auction (derived from auction results response)
  getAuctionBids: async (_auctionId: string, groupId?: string, cycleNumber?: number) => {
    if (!groupId || !cycleNumber) return { data: [] as any[] };
    const response = await api.get(`/auctions/${groupId}/results/${cycleNumber}`);
    return {
      data: (response.data.auction?.bids || []).map((b: any) => ({
        id: b.id,
        discount: b.bidAmount,
        bidTime: b.createdAt,
      })),
    };
  },

  // Place a bid
  placeBid: (auctionId: string, discount: number) =>
    api.post(`/auctions/${auctionId}/bid`, { discount }),

  // Start auction
  startAuction: (groupId: string) =>
    api.post(`/auctions/${groupId}/start`, {}),

  // End auction
  endAuction: (auctionId: string) =>
    api.post(`/auctions/${auctionId}/end`, {}),

  // Get all winners for a group
  getWinners: (groupId: string) => api.get(`/auctions/${groupId}/winners`),
};

// Socket.IO connection for realtime bidding
export const auctionSocket = {
  socket: null as any,

  connect: (token: string) => {
    if (!auctionSocket.socket) {
      auctionSocket.socket = io(`${SOCKET_URL}/auction`, {
        auth: { token },
        reconnection: true,
      });
    }
    return auctionSocket.socket;
  },

  joinGroup: (groupId: number | string) => {
    if (auctionSocket.socket) {
      auctionSocket.socket.emit('joinGroup', Number(groupId));
    }
  },

  disconnect: () => {
    if (auctionSocket.socket) {
      auctionSocket.socket.disconnect();
      auctionSocket.socket = null;
    }
  },

  on: (event: string, callback: (data: any) => void) => {
    if (auctionSocket.socket) {
      auctionSocket.socket.on(event, callback);
    }
  },

  off: (event: string) => {
    if (auctionSocket.socket) {
      auctionSocket.socket.off(event);
    }
  },

  emit: (event: string, data: any) => {
    if (auctionSocket.socket) {
      auctionSocket.socket.emit(event, data);
    }
  },
};
