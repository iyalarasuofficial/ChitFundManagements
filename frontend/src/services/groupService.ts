import api from './api';

export const groupService = {
  // Get all groups for current user
  getMyGroups: () => api.get('/groups'),

  // Get group details
  getGroupById: (groupId: string) => api.get(`/groups/${groupId}`),

  // Get group members
  getGroupMembers: (groupId: string) => api.get(`/groups/${groupId}/members`),

  // Create a new group
  createGroup: (data: {
    name: string;
    contributionAmount: number;
    organizerFeePercent?: number;
    startDate: string;
  }) => api.post('/groups', data),

  // Update group
  updateGroup: (groupId: string, data: any) =>
    api.put(`/groups/${groupId}`, data),

  // Archive group
  archiveGroup: (groupId: string) => api.put(`/groups/${groupId}/archive`, {}),

  // Add member by phone
  addMember: (groupId: string, phone: string) =>
    api.post(`/groups/${groupId}/members`, { phone }),

  // Remove member (memberId = userId expected by backend)
  removeMember: (groupId: string, memberId: string | number) =>
    api.delete(`/groups/${groupId}/members/${memberId}`),

  // Generate contributions for current cycle
  generateContributions: (groupId: string, cycleNumber?: number) =>
    api.post(`/groups/${groupId}/generate-contributions`, { cycleNumber }),

  // Advance cycle
  advanceCycle: (groupId: string) => api.post(`/groups/${groupId}/advance-cycle`, {}),
};
