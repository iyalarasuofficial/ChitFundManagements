import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, Users, Wallet, TrendingUp, Zap, TrendingDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { groupService } from '../../services/groupService';
import { dashboardService } from '../../services/dashboardService';

export const HomePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [homeStats, setHomeStats] = useState({
    activeGroups: 0,
    pendingPayments: 0,
  });

  useEffect(() => {
    loadHomeStats();
  }, []);

  const loadHomeStats = async () => {
    try {
      const [groupsRes, memberDashboardRes] = await Promise.all([
        groupService.getMyGroups(),
        dashboardService.getMemberDashboard(),
      ]);

      const groups = Array.isArray(groupsRes.data?.groups) ? groupsRes.data.groups : [];
      const memberRows = Array.isArray(memberDashboardRes.data) ? memberDashboardRes.data : [];

      const pendingPayments = memberRows.reduce((sum: number, row: any) => {
        const currentDue = row.currentDue;
        if (!currentDue || currentDue.status === 'paid') return sum;
        const unpaid = Math.max((currentDue.adjustedDue || 0) - (currentDue.amountPaid || 0), 0);
        return sum + unpaid + (currentDue.penaltyAmount || 0);
      }, 0);

      setHomeStats({
        activeGroups: groups.filter((group: any) => group.status === 'active').length,
        pendingPayments,
      });
    } catch {
      setHomeStats({ activeGroups: 0, pendingPayments: 0 });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const quickAccessItems = [
    {
      id: 'groups',
      icon: '👥',
      title: 'Groups',
      description: 'View & manage',
      color: 'bg-blue-100',
      route: '/groups',
    },
    {
      id: 'contributions',
      icon: '💰',
      title: 'Contributions',
      description: 'Track payments',
      color: 'bg-emerald-100',
      route: '/contributions',
    },
    {
      id: 'auctions',
      icon: '🏆',
      title: 'Auctions',
      description: 'Active bids',
      color: 'bg-amber-100',
      route: '/auctions',
    },
    {
      id: 'dashboard',
      icon: '📊',
      title: 'Dashboard',
      description: 'Analytics',
      color: 'bg-purple-100',
      route: '/dashboard',
    },
  ];

  const statsCards = [
    {
      title: 'Active Groups',
      value: String(homeStats.activeGroups),
      icon: Users,
      color: 'text-tms-primary',
      bgColor: 'bg-tms-light-purple',
    },
    {
      title: 'Pending Payments',
      value: `₹${homeStats.pendingPayments.toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
  ];

  return (
    <div className="w-full max-w-sm mx-auto bg-white min-h-screen flex flex-col shadow-[0_0_30px_rgba(0,0,0,0.1)]">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-tms-secondary to-tms-secondary-light text-white px-4 py-6 flex justify-between items-center rounded-b-2xl shadow-md">
        <div>
          <h1 className="text-2xl font-bold">Welcome</h1>
          <p className="text-sm text-gray-200 mt-1">{user?.name || 'User'}</p>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          title="Logout"
        >
          <LogOut size={20} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 pb-24 overflow-y-auto px-4 py-6">
        {/* Hero Banner */}
        <div className="mb-6 bg-gradient-to-r from-tms-primary to-tms-primary-dark rounded-2xl p-6 text-white shadow-lg overflow-hidden relative">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
          <div className="relative z-10">
            <h2 className="text-lg font-bold mb-2">Manage Your Groups</h2>
            <p className="text-sm text-white/90 mb-4">
              Organize contributions, track payments, and bid in auctions effortlessly
            </p>
            <button
              onClick={() => navigate('/groups')}
              className="inline-flex items-center gap-2 bg-white text-tms-primary hover:bg-gray-100 px-4 py-2 rounded-lg font-semibold transition-colors text-sm"
            >
              View Groups
              <TrendingUp size={16} />
            </button>
          </div>
        </div>

        {/* Quick Access Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Access</h3>
          <div className="grid grid-cols-2 gap-4">
            {quickAccessItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.route)}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 transition-all duration-200 cursor-pointer hover:shadow-md hover:border-tms-primary/20 group"
              >
                <div className={`${item.color} w-12 h-12 rounded-full flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform`}>
                  {item.icon}
                </div>
                <h4 className="font-semibold text-gray-800 text-sm text-left">{item.title}</h4>
                <p className="text-xs text-gray-600 text-left">{item.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Overview</h3>
          <div className="space-y-4">
            {statsCards.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className={`rounded-xl border border-gray-100 bg-white p-4 shadow-sm ${stat.bgColor}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                      <Icon size={24} className={stat.color} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Cards */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/groups/create')}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 transition-all duration-200 cursor-pointer hover:shadow-md hover:border-tms-primary/20 w-full flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-tms-light-purple text-tms-primary">
                <Zap size={20} />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-gray-800 text-sm">Create New Group</p>
                <p className="text-xs text-gray-600">Start a new chit fund</p>
              </div>
              <span className="text-gray-400">→</span>
            </button>

            <button
              onClick={() => navigate('/contributions')}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 transition-all duration-200 cursor-pointer hover:shadow-md hover:border-tms-primary/20 w-full flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100 text-green-600">
                <Wallet size={20} />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-gray-800 text-sm">Pay Contribution</p>
                <p className="text-xs text-gray-600">Make a payment</p>
              </div>
              <span className="text-gray-400">→</span>
            </button>

            <button
              onClick={() => navigate('/auctions')}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 transition-all duration-200 cursor-pointer hover:shadow-md hover:border-tms-primary/20 w-full flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-amber-100 text-amber-600">
                <TrendingDown size={20} />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-gray-800 text-sm">Participate in Auction</p>
                <p className="text-xs text-gray-600">Win the pot</p>
              </div>
              <span className="text-gray-400">→</span>
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mb-8 p-4 bg-tms-light-purple rounded-lg border border-tms-primary/10">
          <p className="text-xs text-gray-600 text-center">
            💡 Tip: All your groups, contributions, and auctions are synced in real-time
          </p>
        </div>
      </div>
    </div>
  );
};
