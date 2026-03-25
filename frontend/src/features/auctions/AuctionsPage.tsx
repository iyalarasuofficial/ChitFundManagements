import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingDown, Gavel, CircleDollarSign } from 'lucide-react';
import { auctionService, auctionSocket } from '../../services/auctionService';
import { groupService } from '../../services/groupService';
import type { Auction, Bid } from '../../types/api';
import { useAuth } from '../../hooks/useAuth';
import { getClientErrorMessage } from '../../utils/error';
import { PageLoader } from '../common/PageLoader';

export const AuctionsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const groupId = searchParams.get('groupId');
  
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [myBid, setMyBid] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [biddingError, setBiddingError] = useState('');
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [currentCycle, setCurrentCycle] = useState<number | undefined>(undefined);
  const [totalMembers, setTotalMembers] = useState<number | undefined>(undefined);
  const [groupStatus, setGroupStatus] = useState<string | undefined>(undefined);
  const [selectedCycle, setSelectedCycle] = useState<number | undefined>(undefined);
  const [auctionActionError, setAuctionActionError] = useState('');
  const [actionLoading, setActionLoading] = useState<'start' | 'end' | null>(null);
  const [winners, setWinners] = useState<
    Array<{
      cycleNumber: number;
      winnerName: string;
      winnerPhone: string;
      discountAmount: number | null;
      payoutAmount: number | null;
      dividendPerMember: number | null;
    }>
  >([]);

  useEffect(() => {
    loadAuctions();
  }, [groupId, selectedCycle]);

  useEffect(() => {
    // Connect to socket for realtime updates
    if (token && groupId) {
      const socket = auctionSocket.connect(token);

      const handleJoin = () => {
        auctionSocket.joinGroup(groupId);
      };

      const handleNewBid = () => {
        // Keep list and header state fresh as soon as new bids arrive.
        loadAuctions(true);
      };

      const handleAuctionStarted = () => {
        loadAuctions(true);
      };

      const handleAuctionEnded = () => {
        loadAuctions(true);
      };

      socket.on('connect', handleJoin);
      socket.on('reconnect', handleJoin);
      handleJoin();

      socket.on('newBid', handleNewBid);
      socket.on('auctionStarted', handleAuctionStarted);
      socket.on('auctionEnded', handleAuctionEnded);

      return () => {
        socket.off('connect', handleJoin);
        socket.off('reconnect', handleJoin);
        socket.off('newBid', handleNewBid);
        socket.off('auctionStarted', handleAuctionStarted);
        socket.off('auctionEnded', handleAuctionEnded);
      };
    }
  }, [token, groupId]);

  const loadAuctions = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setAuctionActionError('');
      if (!groupId) {
        const groupsRes = await groupService.getMyGroups();
        const myGroups = Array.isArray(groupsRes.data?.groups) ? groupsRes.data.groups : [];

        if (myGroups.length === 0) {
          setAuctions([]);
          setSelectedAuction(null);
          setBids([]);
          setError('No groups found. Create or join a group first.');
          return;
        }

        const preferredGroup = myGroups.find((g: any) => g.status === 'active') || myGroups[0];
        navigate(`/auctions?groupId=${preferredGroup.id}`, { replace: true });
        return;
      }

      if (groupId) {
        setError('');
        const groupRes = await groupService.getGroupById(groupId);
        const groupCycle = groupRes.data?.group?.currentCycle;
        const groupTotalMembers = groupRes.data?.group?.totalMembers;
        const status = groupRes.data?.group?.status;
        setTotalMembers(groupTotalMembers);
        setGroupStatus(status);
        setCurrentCycle(groupCycle);
        setIsOrganizer(Boolean(groupRes.data?.isOrganizer));

        const cycleToLoad = selectedCycle ?? groupCycle;
        setSelectedCycle((prev) => prev ?? groupCycle);

        const [auctionRes, winnerRes] = await Promise.all([
          auctionService.getGroupAuctions(groupId, cycleToLoad),
          auctionService.getWinners(groupId),
        ]);

        const response = auctionRes;
        setAuctions(response.data);
        setWinners(Array.isArray(winnerRes.data?.winners) ? winnerRes.data.winners : []);
        if (response.data.length > 0) {
          setSelectedAuction(response.data[0]);
          loadBids(response.data[0].id, response.data[0].cycleNumber);
        } else {
          setSelectedAuction(null);
          setBids([]);
        }
      }
    } catch (err: any) {
      setError(getClientErrorMessage(err, 'Unable to load auctions right now.'));
    } finally {
      setLoading(false);
    }
  };

  const loadBids = async (auctionId: string, cycleNumber?: number) => {
    try {
      const response = await auctionService.getAuctionBids(auctionId, groupId || undefined, cycleNumber);
      setBids(response.data);
    } catch {
      setBids([]);
    }
  };

  const handleSelectAuction = (auction: Auction) => {
    setSelectedAuction(auction);
    setMyBid('');
    setBiddingError('');
    loadBids(auction.id, auction.cycleNumber);
  };

  const handlePlaceBid = async () => {
    if (!selectedAuction || !myBid) {
      setBiddingError('Enter a bid amount');
      return;
    }

    const discount = Number(myBid);
    if (isNaN(discount) || discount <= 0) {
      setBiddingError('Bid amount must be greater than 0');
      return;
    }

    try {
      setBiddingError('');
      await auctionService.placeBid(selectedAuction.id, discount);
      setMyBid('');
      loadBids(selectedAuction.id, selectedAuction.cycleNumber);
    } catch (err: any) {
      setBiddingError(
        getClientErrorMessage(err, 'Unable to place bid. Please try again.')
      );
    }
  };

  const handleStartAuction = async () => {
    if (!groupId) return;

    try {
      setActionLoading('start');
      setAuctionActionError('');
      await auctionService.startAuction(groupId);
      await loadAuctions(true);
    } catch (err: any) {
      setAuctionActionError(getClientErrorMessage(err, 'Unable to start auction. Please try again.'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleEndAuction = async () => {
    if (!selectedAuction) {
      setAuctionActionError('No active auction selected');
      return;
    }

    try {
      setActionLoading('end');
      setAuctionActionError('');
      await auctionService.endAuction(selectedAuction.id);
      await loadAuctions(true);
    } catch (err: any) {
      setAuctionActionError(getClientErrorMessage(err, 'Unable to end auction. Please try again.'));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <PageLoader title="Auctions" subtitle="Loading auction data..." />;
  }

  return (
    <div className="w-full max-w-sm mx-auto bg-white min-h-screen flex flex-col shadow-[0_0_30px_rgba(0,0,0,0.1)]">
      <div className="bg-gradient-to-r from-tms-secondary to-tms-secondary-light text-white px-4 py-6 flex justify-between items-center rounded-b-2xl shadow-md sticky top-0 z-40">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          title="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Auctions</h1>
        <div className="w-8" />
      </div>

      <div className="flex-1 pb-24 overflow-y-auto px-4 py-6">
        {/* Error message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="mb-5 bg-gradient-to-br from-tms-light-purple to-white border border-tms-primary/10 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">Live Bid Amount</p>
              <p className="text-xs text-gray-600 mt-1">
                Highest bid amount wins the cycle pot.
              </p>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-tms-light-purple text-tms-primary">
              <Gavel size={18} />
            </div>
          </div>
        </div>

        {isOrganizer && (
          <div className="mb-5 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Organizer Controls</h3>

            {auctionActionError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {auctionActionError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={handleStartAuction}
                disabled={actionLoading !== null || !groupId}
                className="rounded-lg bg-tms-primary px-3 py-2 text-sm font-medium text-white hover:bg-tms-primary-dark disabled:opacity-60"
              >
                {actionLoading === 'start'
                  ? 'Starting...'
                  : `Start Auction${currentCycle ? ` (Cycle ${groupStatus === 'completed' ? (totalMembers || currentCycle) : currentCycle})` : ''}`}
              </button>
              <button
                type="button"
                onClick={handleEndAuction}
                disabled={actionLoading !== null || selectedAuction?.status !== 'active'}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
              >
                {actionLoading === 'end' ? 'Ending...' : 'End Selected Active Auction'}
              </button>
            </div>
          </div>
        )}

        {groupId && currentCycle && (
          <div className="mb-5 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <label className="block text-xs font-medium text-gray-700 mb-1">View Cycle History</label>
            <select
              value={selectedCycle ?? currentCycle}
              onChange={(e) => setSelectedCycle(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-tms-primary focus:outline-none focus:ring-2 focus:ring-tms-primary/10"
            >
              {Array.from({
                length: Math.max(
                  1,
                  Math.min(
                    currentCycle,
                    totalMembers || currentCycle
                  )
                )
              }, (_, i) => i + 1).map((cycle) => (
                <option key={cycle} value={cycle}>
                  Cycle {cycle}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Auctions list */}
        {auctions.length === 0 ? (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 transition-all duration-200 text-center py-6 text-gray-500 mb-6">
            <TrendingDown size={32} className="mx-auto mb-2 text-gray-400" />
            No auction found for this cycle yet
          </div>
        ) : (
          <div>
            <div className="space-y-3 mb-5">
              {auctions.map((auction) => (
                <div
                  key={auction.id}
                  onClick={() => handleSelectAuction(auction)}
                  className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 transition-all duration-200 cursor-pointer hover:shadow-md hover:border-tms-primary/20 relative overflow-hidden ${
                    selectedAuction?.id === auction.id
                      ? 'ring-2 ring-tms-primary shadow-md'
                      : ''
                  }`}
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-tms-primary/5 to-transparent rounded-bl-2xl"></div>
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-semibold text-gray-800">
                      Cycle {auction.cycleNumber}
                    </p>
                    <span
                      className={`text-xs ${
                        auction.status === 'active'
                          ? 'bg-amber-100 text-amber-800 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold gap-1'
                          : auction.status === 'completed'
                          ? 'bg-green-100 text-green-800 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold gap-1'
                          : 'bg-blue-100 text-blue-800 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold gap-1'
                      }`}
                    >
                      {auction.status}
                    </span>
                  </div>
                  {auction.winnerGroupMemberId && (
                    <p className="text-xs text-emerald-600 mt-1">
                      Winning Bid: ₹{Number(auction.discount || 0).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Active auction details */}
            {selectedAuction?.status === 'active' && (
              <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-xl p-4 shadow-sm mb-5">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <CircleDollarSign size={18} className="text-tms-primary" />
                  Place Your Bid
                </h3>

                {biddingError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs mb-3">
                    {biddingError}
                  </div>
                )}

                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Your Bid Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={myBid}
                      onChange={(e) => setMyBid(e.target.value)}
                      placeholder="Enter amount"
                      min="1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-tms-primary focus:ring-2 focus:ring-tms-primary/10 transition-all duration-200 bg-white text-sm"
                    />
                  </div>

                  <button
                    onClick={handlePlaceBid}
                    className="bg-tms-primary hover:bg-tms-primary-dark text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 w-full text-sm"
                  >
                    Place Bid
                  </button>
                </div>
              </div>
            )}

            {/* Bids list */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-2 mt-4">
                All Bids
              </h3>
              {bids.length === 0 ? (
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 transition-all duration-200 text-center py-4 text-gray-500 text-sm">
                  No bids yet
                </div>
              ) : (
                <div className="space-y-2">
                  {bids
                    .sort((a, b) => b.discount - a.discount)
                    .map((bid, index) => (
                      <div
                        key={bid.id}
                        className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 transition-all duration-200 flex justify-between items-center"
                      >
                        <div>
                          <p className="text-xs text-gray-500">#{index + 1}</p>
                          <p className="font-medium text-gray-800">
                            ₹{Number(bid.discount || 0).toLocaleString()} bid
                          </p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(bid.bidTime).toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Winners history */}
        <div className="mt-6">
          <h3 className="font-semibold text-gray-800 mb-2">Winners History</h3>
          {winners.length === 0 ? (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center py-4 text-gray-500 text-sm">
              No winners recorded yet
            </div>
          ) : (
            <div className="space-y-2">
              {winners.map((winner) => (
                <div
                  key={`winner-${winner.cycleNumber}`}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-800">Cycle {winner.cycleNumber}</p>
                      <p className="text-xs text-gray-600">{winner.winnerName} ({winner.winnerPhone})</p>
                    </div>
                    <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold text-green-700">
                      Completed
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-gray-600">
                    <p>Discount: ₹{Number(winner.discountAmount ?? 0).toLocaleString()}</p>
                    <p>Payout: ₹{Number(winner.payoutAmount ?? 0).toLocaleString()}</p>
                    <p>Dividend: ₹{Number(winner.dividendPerMember ?? 0).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
