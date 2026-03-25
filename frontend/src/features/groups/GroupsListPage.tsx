import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, TrendingUp, ArrowLeft } from 'lucide-react';
import { groupService } from '../../services/groupService';
import type { ChitGroup } from '../../types/api';
import { getClientErrorMessage } from '../../utils/error';
import { PageLoader } from '../common/PageLoader';

export const GroupsListPage = () => {
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await groupService.getMyGroups();
      setGroups(response.data?.groups || []);
    } catch (err: any) {
      setError(getClientErrorMessage(err, 'Unable to load groups right now.'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageLoader title="My Groups" subtitle="Loading your groups..." />;
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
        <h1 className="text-xl font-bold">My Groups</h1>
        <button
          onClick={() => navigate('/groups/create')}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          title="Create group"
        >
          <Plus size={24} />
        </button>
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

        {/* Empty state */}
        {groups.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm text-center py-12">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-tms-light-purple text-tms-primary mx-auto mb-4">
              <Users size={32} />
            </div>
            <p className="text-gray-700 font-semibold mb-2">No groups yet</p>
            <p className="text-gray-600 text-sm mb-6">
              Create your first chit fund group to get started
            </p>
            <button
              onClick={() => navigate('/groups/create')}
              className="bg-tms-primary hover:bg-tms-primary-dark text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 mx-auto"
            >
              Create Group
            </button>
          </div>
        ) : (
          <>
            {/* Groups Count */}
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold text-tms-primary">{groups.length}</span> group{groups.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Groups List */}
            <div className="space-y-4">
              {groups.map((group) => {
                const potAmount = Number(
                  (group as any).potAmount ??
                    (group as any).currentPotAmount ??
                    ((group as any).contributionAmount ?? 0) * ((group as any).totalMembers ?? 0)
                );
                const monthlyContribution = Number(
                  (group as any).monthlyContribution ?? (group as any).contributionAmount ?? 0
                );
                const cycleDisplay =
                  group.status === 'completed'
                    ? group.totalMembers
                    : Math.min(group.currentCycle, group.totalMembers || group.currentCycle);

                return (
                <div
                  key={group.id}
                  onClick={() => navigate(`/groups/${group.id}`)}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 transition-all duration-200 cursor-pointer hover:shadow-md hover:border-tms-primary/20 relative overflow-hidden"
                >
                  {/* Decorative background */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-tms-primary/5 to-transparent rounded-bl-3xl"></div>

                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800 text-base">{group.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {group.status === 'completed' ? 'Completed' : `Cycle ${cycleDisplay}`}
                        </p>
                      </div>
                      <div className={`text-xs font-semibold px-2 py-1 ${
                        group.status === 'active'
                          ? 'bg-green-100 text-green-800 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold gap-1'
                          : group.status === 'completed'
                          ? 'bg-blue-100 text-blue-800 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold gap-1'
                          : 'bg-amber-100 text-amber-800 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold gap-1'
                      }`}>
                        {group.status.charAt(0).toUpperCase() + group.status.slice(1)}
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                        <Users size={16} className="text-tms-primary" />
                        <div>
                          <p className="text-xs text-gray-600">Members</p>
                          <p className="font-bold text-gray-800">{group.totalMembers}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg">
                        <TrendingUp size={16} className="text-emerald-600" />
                        <div>
                          <p className="text-xs text-gray-600">Pot</p>
                          <p className="font-bold text-gray-800">₹{(potAmount / 1000).toFixed(1)}K</p>
                        </div>
                      </div>
                    </div>

                    {/* Monthly Contribution Info */}
                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-xs text-gray-600">
                        Monthly: <span className="font-bold text-tms-primary">₹{monthlyContribution.toLocaleString()}</span>
                      </p>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

            {/* Create New Group Quick Action */}
            <div className="mt-8 mb-6 p-4 bg-gradient-to-r from-tms-light-purple to-white rounded-xl border border-tms-primary/20">
              <p className="text-sm text-gray-700 mb-3">Want to create a new group?</p>
              <button
                onClick={() => navigate('/groups/create')}
                className="bg-tms-primary hover:bg-tms-primary-dark text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 w-full"
              >
                <Plus size={18} />
                Create New Group
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
