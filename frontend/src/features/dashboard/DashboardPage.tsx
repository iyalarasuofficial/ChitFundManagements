import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, TrendingUp, Wallet } from 'lucide-react';
import { dashboardService } from '../../services/dashboardService';
import { useAuth } from '../../hooks/useAuth';
import { getClientErrorMessage } from '../../utils/error';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [walletTopUp, setWalletTopUp] = useState('');
  const [walletWithdraw, setWalletWithdraw] = useState('');
  const [walletActionError, setWalletActionError] = useState('');
  const [walletActionMessage, setWalletActionMessage] = useState('');
  const [addingFunds, setAddingFunds] = useState(false);
  const [withdrawingFunds, setWithdrawingFunds] = useState(false);
  const [dashboardType, setDashboardType] = useState<'member' | 'organizer'>(
    'member'
  );

  useEffect(() => {
    loadDashboard(Boolean(dashboardData));
  }, [dashboardType]);

  const loadDashboard = async (silent = false) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      let response;

      if (dashboardType === 'organizer') {
        response = await dashboardService.getOrganizerDashboard();
      } else {
        const [memberRes, walletRes] = await Promise.all([
          dashboardService.getMemberDashboard(),
          dashboardService.getWalletBalance(),
        ]);
        response = {
          ...memberRes,
          data: {
            rows: Array.isArray(memberRes.data) ? memberRes.data : [],
            walletBalance: Number(walletRes.data?.walletBalance || 0),
          },
        } as any;
      }

      const rows = Array.isArray((response as any).data)
        ? (response as any).data
        : Array.isArray((response as any).data?.rows)
        ? (response as any).data.rows
        : Array.isArray((response as any).data?.groups)
        ? (response as any).data.groups
        : [];

      if (dashboardType === 'member') {
        const upcomingDueContributions = rows
          .filter((row: any) => row.currentDue && row.currentDue.status !== 'paid')
          .map((row: any, idx: number) => ({
            id: `${row.groupId}-due-${idx}`,
            amountDue: row.currentDue.adjustedDue || 0,
            dueDate: row.currentDue.dueDate,
          }));

        setDashboardData({
          totalGroups: rows.length,
          activeGroupsCount: rows.filter((row: any) => row.groupStatus === 'active').length,
          totalContributions: rows.reduce(
            (sum: number, row: any) => sum + (row.contributionHistory?.length || 0),
            0
          ),
          totalArrearsAmount: rows.reduce(
            (sum: number, row: any) => sum + (row.arrearsAmount || 0),
            0
          ),
          totalBalance: Number((response as any).data?.walletBalance ?? rows[0]?.walletBalance ?? 0),
          memberGroups: rows.map((row: any) => ({
            id: String(row.groupId),
            name: row.groupName,
            currentCycle: row.currentCycle,
                  status: row.groupStatus,
          })),
          upcomingDueContributions,
        });
      } else {
        const overall = (response as any).data?.overall || null;
        setDashboardData({
          totalGroups: rows.length,
          activeGroupsCount: rows.filter((row: any) => row.status === 'active').length,
          totalContributions: rows.reduce(
            (sum: number, row: any) => sum + (row.memberPaymentStatus?.length || 0),
            0
          ),
          totalArrearsAmount: overall?.totalUnpaid ?? rows.reduce((sum: number, row: any) => {
            const pending = (row.memberPaymentStatus || []).reduce(
              (inner: number, p: any) =>
                inner + Math.max((p.amountDue || 0) - (p.amountPaid || 0), 0) + (p.penaltyAmount || 0),
              0
            );
            return sum + pending;
          }, 0),
          totalEarnings: rows.reduce(
            (sum: number, row: any) => sum + (row.organizerEarnings || 0),
            0
          ),
          overall,
          organizingGroups: rows.map((row: any) => ({
            id: String(row.groupId),
            name: row.name,
            totalMembers: row.totalMembers,
            currentCycle: row.currentCycle,
                  status: row.status,
            totalUnpaid: row.dueSummary?.totalUnpaid || 0,
            unpaidMembersCount: row.dueSummary?.unpaidMembersCount || 0,
            unpaidMembers: row.unpaidMembers || [],
          })),
          upcomingDueContributions: [],
        });
      }
    } catch (err: any) {
      // If organizer fails, it's likely user is only a member, so ignore
      if (dashboardType === 'organizer') {
        setDashboardType('member');
      } else {
        setError(getClientErrorMessage(err, 'Unable to load dashboard right now.'));
      }
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleAddFunds = async () => {
    const amount = Number(walletTopUp);
    if (!Number.isFinite(amount) || amount <= 0) {
      setWalletActionError('Enter a valid amount to add');
      setWalletActionMessage('');
      return;
    }

    try {
      setAddingFunds(true);
      setWalletActionError('');
      setWalletActionMessage('');
      await dashboardService.addWalletFunds(amount);
      setWalletTopUp('');
      setWalletActionMessage('Money added to wallet successfully');
      await loadDashboard(true);
    } catch (err: any) {
      setWalletActionError(getClientErrorMessage(err, 'Unable to add wallet money right now.'));
    } finally {
      setAddingFunds(false);
    }
  };

  const handleWithdrawFunds = async () => {
    const amount = Number(walletWithdraw);
    if (!Number.isFinite(amount) || amount <= 0) {
      setWalletActionError('Enter a valid amount to withdraw');
      setWalletActionMessage('');
      return;
    }

    try {
      setWithdrawingFunds(true);
      setWalletActionError('');
      setWalletActionMessage('');
      await dashboardService.withdrawWalletFunds(amount);
      setWalletWithdraw('');
      setWalletActionMessage('Money withdrawn from wallet successfully');
      await loadDashboard(true);
    } catch (err: any) {
      setWalletActionError(getClientErrorMessage(err, 'Unable to withdraw wallet money right now.'));
    } finally {
      setWithdrawingFunds(false);
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="w-full max-w-sm mx-auto bg-white min-h-screen flex flex-col shadow-[0_0_30px_rgba(0,0,0,0.1)]">
        <div className="bg-gradient-to-r from-tms-secondary to-tms-secondary-light text-white px-4 py-6 flex justify-between items-center rounded-b-2xl shadow-md">
          <h1 className="text-xl font-bold">Dashboard</h1>
        </div>
        <div className="flex-1 pb-24 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-tms-primary animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto bg-white min-h-screen flex flex-col shadow-[0_0_30px_rgba(0,0,0,0.1)]">
      <div className="sticky top-0 z-40 bg-gradient-to-r from-tms-secondary to-tms-secondary-light text-white px-4 py-6 flex justify-between items-center rounded-b-2xl shadow-md">
        <button
          onClick={() => navigate('/home')}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          title="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <div className="w-8" />
      </div>

      <div className="flex-1 pb-24 px-4 py-6">
        {refreshing && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            <div className="h-3 w-3 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin"></div>
            Updating dashboard...
          </div>
        )}

        <div className="bg-gradient-to-br from-tms-light-purple to-white border border-tms-primary/10 rounded-xl p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">Financial Snapshot</p>
              <p className="text-xs text-gray-600 mt-1">{user?.name}</p>
            </div>
            <BarChart3 size={22} className="text-tms-primary" />
          </div>
        </div>

        {/* Header */}
        {/* Tab selector */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setDashboardType('member')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
              dashboardType === 'member'
                ? 'bg-tms-primary text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Member
          </button>
          <button
            onClick={() => setDashboardType('organizer')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
              dashboardType === 'organizer'
                ? 'bg-tms-primary text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Organizer
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {dashboardData ? (
          <div className="space-y-4">
            {/* Key stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-white p-4 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 border-blue-100">
                <div className="text-lg font-bold text-blue-700">
                  {dashboardData.totalGroups || 0}
                </div>
                <p className="text-xs text-gray-600">Total Groups</p>
              </div>

              <div className="rounded-xl border bg-white p-4 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-100">
                <div className="text-lg font-bold text-emerald-700">
                  {dashboardData.activeGroupsCount || 0}
                </div>
                <p className="text-xs text-gray-600">Active</p>
              </div>

              <div className="rounded-xl border bg-white p-4 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100 border-amber-100">
                <div className="text-lg font-bold text-amber-700">
                  ₹{(dashboardData.totalArrearsAmount || 0).toLocaleString()}
                </div>
                <p className="text-xs text-gray-600">Arrears</p>
              </div>

              <div className="rounded-xl border bg-white p-4 shadow-sm bg-gradient-to-br from-violet-50 to-violet-100 border-violet-100">
                <div className="text-lg font-bold text-violet-700">
                  {dashboardData.totalContributions || 0}
                </div>
                <p className="text-xs text-gray-600">Contributions</p>
              </div>
            </div>

            {/* Member-specific stats */}
            {dashboardType === 'member' && (
              <>
                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      Wallet Balance (Withdrawable)
                    </p>
                    <p className="text-2xl font-bold text-emerald-700">
                      ₹{(dashboardData.totalBalance || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="text-xs text-gray-500 mb-2">Add Money To Wallet</p>

                  {walletActionError && (
                    <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {walletActionError}
                    </div>
                  )}

                  {walletActionMessage && (
                    <div className="mb-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
                      {walletActionMessage}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={walletTopUp}
                      onChange={(e) => setWalletTopUp(e.target.value)}
                      placeholder="Amount"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-tms-primary focus:outline-none focus:ring-2 focus:ring-tms-primary/10"
                    />
                    <button
                      type="button"
                      onClick={handleAddFunds}
                      disabled={addingFunds || withdrawingFunds}
                      className="rounded-lg bg-tms-primary px-3 py-2 text-sm font-medium text-white hover:bg-tms-primary-dark disabled:opacity-60"
                    >
                      {addingFunds ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="text-xs text-gray-500 mb-2">Withdraw From Wallet</p>

                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={walletWithdraw}
                      onChange={(e) => setWalletWithdraw(e.target.value)}
                      placeholder="Amount"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-tms-primary focus:outline-none focus:ring-2 focus:ring-tms-primary/10"
                    />
                    <button
                      type="button"
                      onClick={handleWithdrawFunds}
                      disabled={withdrawingFunds || addingFunds}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
                    >
                      {withdrawingFunds ? 'Withdrawing...' : 'Withdraw'}
                    </button>
                  </div>
                </div>

                {/* My Groups */}
                {dashboardData.memberGroups && dashboardData.memberGroups.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800 mb-2">
                      My Groups
                    </h2>
                    <div className="space-y-2">
                      {dashboardData.memberGroups.map((group: any) => (
                        <div
                          key={group.id}
                          onClick={() => navigate(`/groups/${group.id}`)}
                          className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm cursor-pointer hover:shadow-md transition"
                        >
                          <p className="font-medium text-gray-800">
                            {group.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {group.status === 'completed' ? 'Completed' : `Cycle ${group.currentCycle}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Organizer-specific stats */}
            {dashboardType === 'organizer' && (
              <>
                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        Total Earnings
                      </p>
                      <p className="text-2xl font-bold text-emerald-700">
                        ₹{(dashboardData.totalEarnings || 0).toLocaleString()}
                      </p>
                    </div>
                    <TrendingUp size={32} className="text-emerald-600 opacity-30" />
                  </div>
                </div>

                {dashboardData.overall && (
                  <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">Overall Unpaid Dues</p>
                    <p className="text-2xl font-bold text-amber-700">
                      ₹{(dashboardData.overall.totalUnpaid || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {dashboardData.overall.unpaidMembersCount || 0} unpaid member entries across all groups
                    </p>
                    <button
                      onClick={() => navigate('/dashboard/unpaid-members')}
                      className="mt-3 w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100"
                    >
                      View All Unpaid Members
                    </button>
                  </div>
                )}

                {/* Organizing groups */}
                {dashboardData.organizingGroups &&
                  dashboardData.organizingGroups.length > 0 && (
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800 mb-2">
                        Organizing
                      </h2>
                      <div className="space-y-2">
                        {dashboardData.organizingGroups.map((group: any) => (
                          <div
                            key={group.id}
                            onClick={() => navigate(`/groups/${group.id}`)}
                            className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm cursor-pointer hover:shadow-md transition"
                          >
                            <p className="font-medium text-gray-800">
                              {group.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {group.totalMembers} members • Cycle{' '}
                              {group.status === 'completed'
                                ? group.totalMembers
                                : Math.min(group.currentCycle, group.totalMembers || group.currentCycle)}
                            </p>
                            <p className="text-xs text-amber-700 mt-1">
                              Unpaid: ₹{(group.totalUnpaid || 0).toLocaleString()} ({group.unpaidMembersCount || 0} members)
                            </p>
                            {(group.unpaidMembers || []).slice(0, 3).map((member: any) => (
                              <p key={`${group.id}-${member.memberId}`} className="text-xs text-gray-600 mt-1">
                                {member.memberName}: ₹{(member.unpaidAmount || 0).toLocaleString()}
                              </p>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </>
            )}

            {/* Upcoming due contributions */}
            {dashboardData.upcomingDueContributions &&
              dashboardData.upcomingDueContributions.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 mb-2">
                    Upcoming Dues
                  </h2>
                  <div className="space-y-2">
                    {dashboardData.upcomingDueContributions.slice(0, 3).map((contrib: any) => (
                      <div
                        key={contrib.id}
                        className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm flex justify-between items-center border-l-4 border-l-amber-500"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            ₹{contrib.amountDue}
                          </p>
                          <p className="text-xs text-gray-500">
                            Due:{' '}
                            {new Date(contrib.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                        <Wallet size={20} className="text-amber-600" />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => navigate('/contributions')}
                    className="bg-white border-2 border-tms-primary text-tms-primary hover:bg-tms-light-purple font-medium py-3 px-4 rounded-lg transition-all duration-200 w-full mt-2 text-sm"
                  >
                    View All
                  </button>
                </div>
              )}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm text-center py-6 text-gray-500">
            No dashboard data available
          </div>
        )}
      </div>
    </div>
  );
};
