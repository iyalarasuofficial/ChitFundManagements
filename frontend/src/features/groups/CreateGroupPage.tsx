import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Wallet } from 'lucide-react';
import { groupService } from '../../services/groupService';
import { getClientErrorMessage } from '../../utils/error';

export const CreateGroupPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    contributionAmount: '',
    organizerFeePercent: '5',
    startDate: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Group name is required');
      return;
    }

    if (!formData.contributionAmount || isNaN(Number(formData.contributionAmount))) {
      setError('Valid contribution amount is required');
      return;
    }

    if (!formData.startDate) {
      setError('Start date is required');
      return;
    }

    setLoading(true);

    try {
      const response = await groupService.createGroup({
        name: formData.name,
        contributionAmount: Number(formData.contributionAmount),
        organizerFeePercent: Number(formData.organizerFeePercent) || 5,
        startDate: formData.startDate,
      });

      navigate(`/groups/${response.data?.group?.id}`);
    } catch (err: any) {
      setError(getClientErrorMessage(err, 'Unable to create group. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-white min-h-screen flex flex-col shadow-[0_0_30px_rgba(0,0,0,0.1)]">
      <div className="sticky top-0 z-40 bg-gradient-to-r from-tms-secondary to-tms-secondary-light text-white px-4 py-6 flex justify-between items-center rounded-b-2xl shadow-md">
        <button
          onClick={() => navigate('/groups')}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          title="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Create Group</h1>
        <div className="w-8" />
      </div>

      <div className="flex-1 pb-24 px-4 py-6">
        <div className="bg-gradient-to-br from-tms-light-purple to-white border border-tms-primary/10 rounded-xl p-4 shadow-sm mb-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-tms-light-purple text-tms-primary">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="font-semibold text-gray-800">Start a Trusted Group</p>
              <p className="text-xs text-gray-600 mt-1">
                Define the pot and monthly plan. Members can join after creation.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter group name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-tms-primary focus:ring-2 focus:ring-tms-primary/10 transition-all duration-200 bg-white"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Wallet size={14} className="text-tms-primary" />
              Contribution Amount (₹) *
            </label>
            <input
              type="number"
              name="contributionAmount"
              value={formData.contributionAmount}
              onChange={handleChange}
              placeholder="e.g., 5000"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-tms-primary focus:ring-2 focus:ring-tms-primary/10 transition-all duration-200 bg-white"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Monthly member contribution amount
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organizer Fee (%)</label>
            <input
              type="number"
              name="organizerFeePercent"
              value={formData.organizerFeePercent}
              onChange={handleChange}
              placeholder="e.g., 5"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-tms-primary focus:ring-2 focus:ring-tms-primary/10 transition-all duration-200 bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-tms-primary focus:ring-2 focus:ring-tms-primary/10 transition-all duration-200 bg-white"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              First cycle due date is generated from this date
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-tms-primary hover:bg-tms-primary-dark text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 w-full disabled:opacity-50 mt-3"
          >
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </form>

        <div className="mt-5 rounded-xl border border-gray-100 p-4 shadow-sm bg-gray-50 border-dashed">
          <p className="text-xs text-gray-600">
            Tip: Keep contribution amount realistic for all members to reduce missed payments.
          </p>
        </div>
      </div>
    </div>
  );
};
