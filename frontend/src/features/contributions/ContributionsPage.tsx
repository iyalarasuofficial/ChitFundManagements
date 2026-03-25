import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, CheckCircle, TrendingUp, Wallet } from 'lucide-react';
import { contributionService } from '../../services/contributionService';
import type { Contribution } from '../../types/api';
import { getClientErrorMessage } from '../../utils/error';
import { PageLoader } from '../common/PageLoader';

export const ContributionsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const groupId = searchParams.get('groupId');
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'pending' | 'paid'>('all');

  useEffect(() => {
    loadContributions();
  }, [groupId]);

  const loadContributions = async () => {
    try {
      setLoading(true);
      if (groupId) {
        const response = await contributionService.getGroupContributions(groupId);
        setContributions(response.data);
      } else {
        const response = await contributionService.getMyContributions();
        setContributions(response.data);
      }
    } catch (err: any) {
      setError(getClientErrorMessage(err, 'Unable to load contributions right now.'));
    } finally {
      setLoading(false);
    }
  };

  const filteredContributions = contributions.filter((contrib) => {
    if (selectedTab === 'pending') return contrib.status === 'pending' || contrib.status === 'overdue';
    if (selectedTab === 'paid') return contrib.status === 'paid';
    return true;
  });

  const handleOpenContribution = (contributionId: string) => {
    if (!/^\d+$/.test(String(contributionId))) {
      setError('Detailed view is unavailable for this contribution entry');
      return;
    }
    navigate(`/contributions/${contributionId}`);
  };

  const handlePayNow = () => {
    const nextPayable = contributions.find(
      (contrib) =>
        (contrib.status === 'pending' || contrib.status === 'overdue') &&
        contrib.amountDue + contrib.penaltyAmount > contrib.amountPaid &&
        /^\d+$/.test(String(contrib.id))
    );

    if (!nextPayable) {
      setError('No payable contribution details are available right now.');
      return;
    }

    navigate(`/contributions/${nextPayable.id}`);
  };

  const stats = {
    total: contributions.length,
    pending: contributions.filter(
      (c) => c.status === 'pending' || c.status === 'overdue'
    ).length,
    paid: contributions.filter((c) => c.status === 'paid').length,
    totalDue: contributions
      .filter((c) => c.status !== 'paid')
      .reduce((sum, c) => sum + (c.amountDue - c.amountPaid), 0),
  };

  if (loading) {
    return <PageLoader title="Contributions" subtitle="Loading contributions..." />;
  }

  return (
    <div className="w-full max-w-sm mx-auto bg-white min-h-screen flex flex-col shadow-[0_0_30px_rgba(0,0,0,0.1)]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-tms-secondary to-tms-secondary-light text-white px-4 py-6 flex justify-between items-center rounded-b-2xl shadow-md">
        <button
          onClick={() => navigate('/home')}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          title="Go back"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Contributions</h1>
        <div className="w-8"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 pb-24 px-4 py-6">
        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Main Stats - Totals */}
        <div className="mb-6">
          <div className="rounded-xl bg-white p-4 shadow-sm bg-gradient-to-br from-tms-light-purple to-white border border-tms-primary/20">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-tms-light-purple text-tms-primary">
                <Wallet size={24} />
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600">Total Due</p>
                <p className="text-2xl font-bold text-tms-primary">
                  ₹{stats.totalDue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-tms-primary">{stats.total}</p>
            <p className="text-xs text-gray-600 mt-1">Total</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-xs text-gray-600 mt-1">Pending</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.paid}</p>
            <p className="text-xs text-gray-600 mt-1">Paid</p>
          </div>
        </div>

        {/* Tab buttons */}
        <div className="flex gap-2 mb-6">
          {(['all', 'pending', 'paid'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                selectedTab === tab
                  ? 'bg-tms-primary text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Contributions list */}
        {filteredContributions.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm text-center py-12">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-tms-light-purple text-tms-primary mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <p className="text-gray-700 font-semibold mb-2">No contributions</p>
            <p className="text-gray-600 text-sm">
              {selectedTab === 'paid'
                ? 'You have no paid contributions yet'
                : selectedTab === 'pending'
                ? 'No pending contributions'
                : 'No contributions to display'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredContributions.map((contrib) => (
              <div
                key={contrib.id}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 transition-all duration-200 cursor-pointer hover:shadow-md hover:border-tms-primary/20 relative overflow-hidden"
                onClick={() => handleOpenContribution(contrib.id)}
              >
                {/* Decorative background */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-tms-primary/5 to-transparent rounded-bl-3xl"></div>

                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-gray-800">
                        Cycle {contrib.cycleNumber}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(contrib.dueDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className={`rounded-full p-2 ${
                      contrib.status === 'paid'
                        ? 'bg-emerald-100'
                        : contrib.status === 'overdue'
                        ? 'bg-red-100'
                        : 'bg-amber-100'
                    }`}>
                      {contrib.status === 'paid' ? (
                        <CheckCircle size={20} className="text-emerald-600" />
                      ) : (
                        <AlertCircle size={20} className="text-red-600" />
                      )}
                    </div>
                  </div>

                  {/* Amount Info */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Due Amount</span>
                      <span className="font-bold text-gray-800">
                        ₹{contrib.amountDue.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Paid</span>
                      <span className="font-semibold text-emerald-600">
                        ₹{contrib.amountPaid.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Penalty if exists */}
                  {contrib.penaltyAmount > 0 && (
                    <div className="bg-red-50 rounded-lg p-3 mb-3 border border-red-100">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-red-700 font-medium">Penalty</span>
                        <span className="font-bold text-red-600">
                          ₹{contrib.penaltyAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="flex justify-end">
                    <span
                      className={`text-xs font-semibold px-3 py-1 ${
                        contrib.status === 'paid'
                          ? 'bg-green-100 text-green-800 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold gap-1'
                          : contrib.status === 'overdue'
                          ? 'bg-red-100 text-red-800 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold gap-1'
                          : 'bg-amber-100 text-amber-800 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold gap-1'
                      }`}
                    >
                      {contrib.status.charAt(0).toUpperCase() + contrib.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Card - Pay Now */}
        {stats.totalDue > 0 && (
          <div className="mt-8 mb-6 bg-gradient-to-r from-tms-primary to-tms-primary-dark rounded-xl p-4 text-white shadow-lg">
            <p className="text-sm mb-3">Ready to make a payment?</p>
            <button
              onClick={handlePayNow}
              className="w-full bg-white text-tms-primary hover:bg-gray-100 py-2.5 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <TrendingUp size={18} />
              Pay Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
