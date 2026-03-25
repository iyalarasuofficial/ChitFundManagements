import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { Navbar } from './features/common/Navbar';
import { HomePage } from './pages/dashboard/HomePage';
import { GroupsListPage } from './pages/groups/GroupsListPage';
import { GroupDetailPage } from './pages/groups/GroupDetailPage';
import { AuctionsPage } from './pages/auctions/AuctionsPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ContributionsPage } from './pages/contributions/ContributionsPage';
import { ContributionDetailPage } from './pages/contributions/ContributionDetailPage';
import { CreateGroupPage } from './pages/groups/CreateGroupPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OrganizerUnpaidMembersPage } from './pages/dashboard/OrganizerUnpaidMembersPage';

const ProtectedShell = () => (
  <>
    <Outlet />
    <Navbar />
  </>
);

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <ProtectedShell />
          </ProtectedRoute>
        }
      >
        <Route path="/home" element={<HomePage />} />
        <Route path="/groups" element={<GroupsListPage />} />
        <Route path="/groups/create" element={<CreateGroupPage />} />
        <Route path="/groups/:groupId" element={<GroupDetailPage />} />
        <Route path="/contributions" element={<ContributionsPage />} />
        <Route path="/contributions/:id" element={<ContributionDetailPage />} />
        <Route path="/auctions" element={<AuctionsPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dashboard/unpaid-members" element={<OrganizerUnpaidMembersPage />} />
      </Route>

      {/* Default redirect */}
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}

export default App;
