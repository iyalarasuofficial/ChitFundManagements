import api from './api';

export const dashboardService = {
  // Get member dashboard
  getMemberDashboard: () => api.get('/dashboard/member'),

  // Get organizer dashboard
  getOrganizerDashboard: () => api.get('/dashboard/organizer'),

  // Get group dashboard (for organizers)
  getGroupDashboard: (groupId: string) =>
    api.get(`/dashboard/group/${groupId}`),

  // Wallet
  getWalletBalance: () => api.get('/wallet/balance'),
  addWalletFunds: (amount: number) => api.post('/wallet/add-funds', { amount }),
  withdrawWalletFunds: (amount: number) => api.post('/wallet/withdraw', { amount }),
};
