import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertCircle, Wallet } from 'lucide-react';
import { contributionService } from '../../services/contributionService';
import { getClientErrorMessage } from '../../utils/error';

type ContributionDetail = {
  id: string;
  groupId: string;
  memberId: string;
  cycleNumber: number;
  amountDue: number;
  amountPaid: number;
  penaltyAmount: number;
  dueDate: string;
  paidDate?: string;
  isArrear: boolean;
  status: string;
  memberName: string;
  memberPhone: string;
  groupName: string;
};

export const ContributionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [contribution, setContribution] = useState<ContributionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  const remainingAmount = useMemo(() => {
    if (!contribution) return 0;
    const due = contribution.amountDue + contribution.penaltyAmount;
    return Math.max(0, due - contribution.amountPaid);
  }, [contribution]);

  const loadContribution = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError('');
      const response = await contributionService.getContributionById(id);
      const payload = response.data as ContributionDetail | null;
      if (!payload) {
        setError('Contribution not found');
        setContribution(null);
        return;
      }
      setContribution(payload);
    } catch (err: any) {
      setError(getClientErrorMessage(err, 'Unable to load contribution details right now.'));
      setContribution(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContribution();
  }, [id]);

  const handlePayRemaining = async () => {
    if (!contribution || remainingAmount <= 0) return;

    try {
      setIsPaying(true);
      setActionError('');
      await contributionService.payContribution(contribution.id, remainingAmount, 'wallet');
      await loadContribution();
    } catch (err: any) {
      setActionError(getClientErrorMessage(err, 'Unable to record payment. Please try again.'));
    } finally {
      setIsPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-sm mx-auto bg-white min-h-screen flex flex-col shadow-[0_0_30px_rgba(0,0,0,0.1)]">
        <div className="bg-gradient-to-r from-tms-secondary to-tms-secondary-light text-white px-4 py-6 rounded-b-2xl shadow-md">
          <h1 className="text-xl font-bold">Contribution Detail</h1>
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
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          title="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Contribution Detail</h1>
        <div className="w-8" />
      </div>

      <div className="flex-1 pb-24 px-4 py-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!error && contribution && (
          <>
            <div className="mb-5 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-600">Group</p>
              <p className="text-lg font-bold text-gray-900">{contribution.groupName}</p>
              <p className="mt-2 text-xs text-gray-600">Member</p>
              <p className="text-sm font-medium text-gray-800">
                {contribution.memberName} ({contribution.memberPhone})
              </p>
            </div>

            <div className="mb-5 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-gray-800">Cycle {contribution.cycleNumber}</p>
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    contribution.status === 'paid'
                      ? 'bg-green-100 text-green-700'
                      : contribution.status === 'overdue'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {contribution.status}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Due amount</span>
                  <span className="font-semibold text-gray-900">₹{contribution.amountDue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Penalty</span>
                  <span className="font-semibold text-gray-900">₹{contribution.penaltyAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Paid amount</span>
                  <span className="font-semibold text-emerald-700">₹{contribution.amountPaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-2">
                  <span className="text-gray-700 font-medium">Remaining</span>
                  <span className="font-bold text-tms-primary">₹{remainingAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Due date</span>
                  <span className="font-medium text-gray-800">
                    {new Date(contribution.dueDate).toLocaleDateString('en-IN')}
                  </span>
                </div>
                {contribution.paidDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Paid date</span>
                    <span className="font-medium text-gray-800">
                      {new Date(contribution.paidDate).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {actionError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {actionError}
              </div>
            )}

            <button
              type="button"
              onClick={handlePayRemaining}
              disabled={remainingAmount <= 0 || isPaying}
              className="w-full rounded-lg bg-tms-primary px-4 py-3 text-sm font-semibold text-white hover:bg-tms-primary-dark disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {remainingAmount <= 0 ? <CheckCircle size={16} /> : <Wallet size={16} />}
              {remainingAmount <= 0
                ? 'Fully Paid'
                : isPaying
                ? 'Processing Wallet Payment...'
                : `Pay From Wallet ₹${remainingAmount.toLocaleString()}`}
            </button>

            {contribution.status === 'overdue' && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5" />
                This contribution is overdue. Penalties may continue to apply.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
