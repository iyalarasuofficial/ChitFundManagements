export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  walletBalance?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChitGroup {
  id: string;
  name: string;
  description?: string;
  potAmount: number;
  monthlyContribution: number;
  organizerId: string;
  organizerEarnings: number;
  totalMembers: number;
  currentCycle: number;
  status: 'active' | 'completed' | 'pending';
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  memberId: string;
  joinedAt: string;
  dividendCredit: number;
  arrearsAmount: number;
  status: 'active' | 'inactive' | 'removed';
  member?: User;
}

export interface Contribution {
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
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  createdAt: string;
  updatedAt: string;
}

export interface Auction {
  id: string;
  groupId: string;
  cycleNumber: number;
  winnerGroupMemberId?: string;
  discount: number;
  payout: number;
  status: 'pending' | 'active' | 'completed';
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bid {
  id: string;
  auctionId: string;
  memberId: string;
  discount: number;
  bidTime: string;
  createdAt: string;
}

export interface Dashboard {
  totalGroups: number;
  activeGroupsCount: number;
  totalContributions: number;
  totalArrearsAmount: number;
  upcomingDueContributions: Contribution[];
  recentAuctions: Auction[];
}

export interface OrganizerDashboard extends Dashboard {
  organizingGroups: ChitGroup[];
  totalEarnings: number;
  pendingPayments: Contribution[];
}

export interface MemberDashboard extends Dashboard {
  memberGroups: ChitGroup[];
  totalBalance: number; // wallet balance in member dashboard UI
  dividendCredit: number;
  myAuctions: Auction[];
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  phone: string;
  email?: string;
  password: string;
}
