import api from './api';
import { dashboardService } from './dashboardService';

export const contributionService = {
  // Get contributions for a group
  getGroupContributions: async (groupId: string) => {
    const response = await api.get(`/${groupId}/contributions`);
    const raw = Array.isArray(response.data)
      ? response.data
      : Array.isArray(response.data?.dues)
      ? response.data.dues
      : Array.isArray(response.data?.contributions)
      ? response.data.contributions
      : [];

    return {
      data: raw.map((c: any) => ({
        id: String(c.id),
        groupId: String(groupId),
        memberId: String(c.groupMemberId || ''),
        cycleNumber: c.cycleNumber,
        amountDue: c.adjustedDue ?? c.amountDue ?? 0,
        amountPaid: c.amountPaid ?? 0,
        penaltyAmount: c.penaltyAmount ?? 0,
        dueDate: c.dueDate || new Date().toISOString(),
        paidDate: c.paymentDate,
        isArrear: c.isArrear || false,
        status: c.status === 'arrear' || c.status === 'late' ? 'overdue' : c.status,
        createdAt: c.createdAt || new Date().toISOString(),
        updatedAt: c.updatedAt || new Date().toISOString(),
      })),
    };
  },

  // Get member contributions (derived from member dashboard payload)
  getMyContributions: async () => {
    const response = await dashboardService.getMemberDashboard();
    const data = Array.isArray(response.data) ? response.data : [];
    const flattened = data.flatMap((group: any) =>
      (group.contributionHistory || []).map((c: any, idx: number) => ({
        id: String(c.id ?? `${group.groupId}-${c.cycleNumber}-${idx}`),
        groupId: String(group.groupId),
        memberId: 'self',
        cycleNumber: c.cycleNumber,
        amountDue: c.amountDue,
        amountPaid: c.amountPaid,
        penaltyAmount: c.penaltyAmount || 0,
        status: c.status === 'arrear' || c.status === 'late' ? 'overdue' : c.status,
        dueDate: group.currentDue?.dueDate || new Date().toISOString(),
        paidDate: undefined,
        isArrear: c.isArrear || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
    );
    return { data: flattened };
  },

  // Get specific contribution
  getContributionById: async (contributionId: string) => {
    const response = await api.get(`/contributions/${contributionId}`);
    const c = response.data?.contribution;

    if (!c) {
      return { data: null };
    }

    return {
      data: {
        id: String(c.id),
        groupId: String(c.member?.groupId ?? ''),
        memberId: String(c.groupMemberId ?? ''),
        cycleNumber: c.cycleNumber,
        amountDue: c.adjustedDue ?? c.amountDue ?? 0,
        amountPaid: c.amountPaid ?? 0,
        penaltyAmount: c.penaltyAmount ?? 0,
        dueDate: c.dueDate || new Date().toISOString(),
        paidDate: c.paymentDate,
        isArrear: Boolean(c.isArrear),
        status: c.status === 'arrear' || c.status === 'late' ? 'overdue' : c.status,
        createdAt: c.paymentDate || new Date().toISOString(),
        updatedAt: c.paymentDate || new Date().toISOString(),
        memberName: c.member?.user?.name || 'Member',
        memberPhone: c.member?.user?.phone || '-',
        groupName: c.member?.group?.name || 'Group',
      },
    };
  },

  // Pay contribution
  payContribution: (contributionId: string, amount: number, paymentMethod = 'wallet') =>
    api.post(`/contributions/${contributionId}/pay`, { amount, paymentMethod }),

  // Apply late penalty (organizer)
  applyPenalty: (contributionId: string, daysLate: number) =>
    api.post(`/contributions/${contributionId}/penalty`, { daysLate }),
};
