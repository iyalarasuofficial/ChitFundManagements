import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, Users, Wallet, RefreshCw, UserPlus, Trash2 } from 'lucide-react';
import { groupService } from '../../services/groupService';
import type { ChitGroup, GroupMember } from '../../types/api';
import { getClientErrorMessage } from '../../utils/error';
import { PageLoader } from '../common/PageLoader';

export const GroupDetailPage = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState<ChitGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | number | null>(null);
  const [memberActionMessage, setMemberActionMessage] = useState('');
  const [memberActionError, setMemberActionError] = useState('');
  const [lifecycleAction, setLifecycleAction] = useState<'activate' | 'advance' | null>(null);
  const [lifecycleMessage, setLifecycleMessage] = useState('');
  const [lifecycleError, setLifecycleError] = useState('');

  useEffect(() => {
    loadGroupData();
  }, [groupId]);

  const loadGroupData = async () => {
    if (!groupId) return;

    try {
      setLoading(true);
      const [groupRes, membersRes] = await Promise.all([
        groupService.getGroupById(groupId),
        groupService.getGroupMembers(groupId),
      ]);
      setGroup(groupRes.data?.group || null);
      setIsOrganizer(!!groupRes.data?.isOrganizer);
      setMembers(membersRes.data?.members || []);
    } catch (err: any) {
      setError(getClientErrorMessage(err, 'Unable to load group details right now.'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageLoader title="Group Details" subtitle="Loading group details..." />;
  }

  if (!group) {
    return (
      <div className="w-full max-w-sm mx-auto bg-white min-h-screen flex flex-col shadow-[0_0_30px_rgba(0,0,0,0.1)]">
        <div className="bg-gradient-to-r from-tms-secondary to-tms-secondary-light text-white px-4 py-6 flex justify-between items-center rounded-b-2xl shadow-md">
          <h1 className="text-xl font-bold">Group Details</h1>
        </div>
        <div className="flex-1 pb-24 px-4 py-6">
          <button
            onClick={() => navigate('/groups')}
            className="mb-4 flex items-center gap-2 text-tms-primary hover:text-tms-primary-dark"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm text-center py-8 text-gray-600">
            Group not found
          </div>
        </div>
      </div>
    );
  }

  const normalizedPotAmount = Number(
    (group as any).potAmount ??
      (group as any).currentPotAmount ??
      ((group as any).contributionAmount ?? 0) * ((group as any).totalMembers ?? 0)
  );

  const normalizedMonthlyContribution = Number(
    (group as any).monthlyContribution ?? (group as any).contributionAmount ?? 0
  );
  const cycleDisplay =
    group.status === 'completed'
      ? group.totalMembers
      : Math.min(group.currentCycle, group.totalMembers || group.currentCycle);

  const canAddMembers = group.status === 'pending' && group.currentCycle <= 1;

  const handleAddMember = async () => {
    if (!groupId) return;

    if (!canAddMembers) {
      setMemberActionError('Adding members after group start is disabled');
      setMemberActionMessage('');
      return;
    }

    const phone = memberPhone.trim();
    if (!/^\d{10}$/.test(phone)) {
      setMemberActionError('Enter a valid 10-digit phone number');
      setMemberActionMessage('');
      return;
    }

    try {
      setAddingMember(true);
      setMemberActionError('');
      setMemberActionMessage('');
      await groupService.addMember(groupId, phone);
      setMemberPhone('');
      setMemberActionMessage('Member added successfully');
      await loadGroupData();
    } catch (err: any) {
      setMemberActionError(getClientErrorMessage(err, 'Unable to add member. Please try again.'));
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (member: any) => {
    if (!groupId) return;

    const targetUserId = member.userId ?? member.memberId;
    if (!targetUserId) {
      setMemberActionError('Could not identify member to remove');
      setMemberActionMessage('');
      return;
    }

    if (member.role === 'organizer') {
      setMemberActionError('Organizer cannot be removed');
      setMemberActionMessage('');
      return;
    }

    try {
      setRemovingMemberId(targetUserId);
      setMemberActionError('');
      setMemberActionMessage('');
      await groupService.removeMember(groupId, targetUserId);
      setMemberActionMessage('Member removed successfully');
      await loadGroupData();
    } catch (err: any) {
      setMemberActionError(getClientErrorMessage(err, 'Unable to remove member. Please try again.'));
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleActivateGroup = async () => {
    if (!groupId) return;

    try {
      setLifecycleAction('activate');
      setLifecycleError('');
      setLifecycleMessage('');
      await groupService.updateGroup(groupId, { status: 'active' });
      setLifecycleMessage('Group activated successfully');
      await loadGroupData();
    } catch (err: any) {
      setLifecycleError(getClientErrorMessage(err, 'Unable to activate the group. Please try again.'));
    } finally {
      setLifecycleAction(null);
    }
  };

  const handleAdvanceCycle = async () => {
    if (!groupId) return;

    if (group.status !== 'active') {
      setLifecycleError('Activate the group before advancing cycle');
      setLifecycleMessage('');
      return;
    }

    try {
      setLifecycleAction('advance');
      setLifecycleError('');
      setLifecycleMessage('');
      await groupService.advanceCycle(groupId);
      setLifecycleMessage('Cycle advanced successfully');
      await loadGroupData();
    } catch (err: any) {
      setLifecycleError(getClientErrorMessage(err, 'Unable to advance cycle. Please try again.'));
    } finally {
      setLifecycleAction(null);
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
        <h1 className="text-xl font-bold truncate max-w-[210px]">{group.name}</h1>
        <div className="w-8" />
      </div>

      <div className="flex-1 pb-24 px-4 py-6">
        {/* Error message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="bg-gradient-to-br from-tms-light-purple to-white border border-tms-primary/10 rounded-xl p-4 shadow-sm mb-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-600">Status</p>
              <span
                className={`mt-2 ${
                  group.status === 'active'
                    ? 'bg-green-100 text-green-800 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold gap-1'
                    : group.status === 'completed'
                    ? 'bg-blue-100 text-blue-800 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold gap-1'
                    : 'bg-amber-100 text-amber-800 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold gap-1'
                }`}
              >
                {group.status}
              </span>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600">Current Cycle</p>
              <p className="text-2xl font-bold text-tms-primary">
                {group.status === 'completed' ? 'Done' : cycleDisplay}
              </p>
            </div>
          </div>
        </div>

        {/* Group info cards */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="rounded-xl border bg-white p-4 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600">Pot Amount</p>
              <Wallet size={14} className="text-blue-600" />
            </div>
            <div className="text-xl font-bold text-blue-700">
              ₹{normalizedPotAmount.toLocaleString()}
            </div>
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600">Monthly</p>
              <RefreshCw size={14} className="text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-emerald-700">
              ₹{normalizedMonthlyContribution.toLocaleString()}
            </div>
            <p className="text-xs text-gray-600">Contribution</p>
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm bg-gradient-to-br from-violet-50 to-violet-100 border-violet-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600">Members</p>
              <Users size={14} className="text-violet-600" />
            </div>
            <div className="text-xl font-bold text-violet-700">
              {group.totalMembers}
            </div>
            <p className="text-xs text-gray-600">Total joined</p>
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100 border-amber-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600">Stage</p>
              <Zap size={14} className="text-amber-600" />
            </div>
            <div className="text-xl font-bold text-amber-700">
              {group.status === 'completed' ? 'Completed' : `Cycle ${cycleDisplay}`}
            </div>
            <p className="text-xs text-gray-600">Running phase</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => navigate(`/contributions?groupId=${groupId}`)}
            className="bg-tms-primary hover:bg-tms-primary-dark text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 w-full"
          >
            View Contributions
          </button>
          <button
            onClick={() => navigate(`/auctions?groupId=${groupId}`)}
            className="bg-white border-2 border-tms-primary text-tms-primary hover:bg-tms-light-purple font-medium py-3 px-4 rounded-lg transition-all duration-200 w-full"
          >
            <Zap size={16} className="inline mr-2" />
            View Auctions
          </button>
        </div>

        {isOrganizer && (
          <div className="mb-6 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-gray-800 mb-3">Cycle Management</h2>

            {lifecycleError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {lifecycleError}
              </div>
            )}

            {lifecycleMessage && (
              <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
                {lifecycleMessage}
              </div>
            )}

            <div className="grid grid-cols-1 gap-2">
              {group.status === 'pending' ? (
                <button
                  type="button"
                  onClick={handleActivateGroup}
                  disabled={lifecycleAction !== null}
                  className="rounded-lg border border-tms-primary/20 bg-tms-light-purple px-3 py-2 text-sm font-medium text-tms-primary hover:bg-tms-light-purple/70 disabled:opacity-60"
                >
                  {lifecycleAction === 'activate' ? 'Activating...' : 'Activate Group'}
                </button>
              ) : group.status === 'active' ? (
                <button
                  type="button"
                  onClick={handleAdvanceCycle}
                  disabled={lifecycleAction !== null}
                  className="rounded-lg bg-tms-primary px-3 py-2 text-sm font-medium text-white hover:bg-tms-primary-dark disabled:opacity-60"
                >
                  {lifecycleAction === 'advance' ? 'Advancing...' : 'Advance Cycle'}
                </button>
              ) : (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  Group completed. No further cycle actions are allowed.
                </div>
              )}
            </div>
          </div>
        )}

        {isOrganizer && (
          <div className="mb-6 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-gray-800 mb-3">Manage Members</h2>

            {memberActionError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {memberActionError}
              </div>
            )}

            {memberActionMessage && (
              <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
                {memberActionMessage}
              </div>
            )}

            {canAddMembers ? (
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={memberPhone}
                  onChange={(e) => setMemberPhone(e.target.value)}
                  placeholder="Enter 10-digit phone"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-tms-primary focus:outline-none focus:ring-2 focus:ring-tms-primary/10"
                />
                <button
                  type="button"
                  onClick={handleAddMember}
                  disabled={addingMember}
                  className="inline-flex items-center gap-1 rounded-lg bg-tms-primary px-3 py-2 text-sm font-medium text-white hover:bg-tms-primary-dark disabled:opacity-50"
                >
                  <UserPlus size={16} />
                  {addingMember ? 'Adding...' : 'Add'}
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* Members section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Members</h2>
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            {members.length === 0 ? (
              <p className="text-gray-500 text-sm">No members yet</p>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-b-0"
                  >
                    <div>
                      <p className="font-medium text-gray-800 text-sm">
                        {(member as any).name || member.member?.name || 'Member'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(member as any).phone || member.member?.phone || '-'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(member as any).role && (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold uppercase text-blue-700">
                          {(member as any).role}
                        </span>
                      )}
                      <span
                        className={`text-xs ${
                          member.status === 'active'
                            ? 'bg-green-100 text-green-800 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold gap-1'
                            : 'bg-red-100 text-red-800 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold gap-1'
                        }`}
                      >
                        {member.status}
                      </span>
                      {isOrganizer && (member as any).role !== 'organizer' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member)}
                          disabled={
                            removingMemberId === ((member as any).userId ?? (member as any).memberId)
                          }
                          className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                          title="Remove member"
                        >
                          <Trash2 size={12} className="mr-1" />
                          {removingMemberId === ((member as any).userId ?? (member as any).memberId)
                            ? 'Removing...'
                            : 'Remove'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
