import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ROLES } from './data/mockData';
import BottomNav from './components/common/BottomNav';
import RatingModal from './components/common/RatingModal';
import WelcomeScreen from './screens/auth/WelcomeScreen';
import LoginScreen from './screens/auth/LoginScreen';
import OnboardingFlow from './screens/auth/OnboardingFlow';
import SeniorHome from './screens/senior/SeniorHome';
import RequestHelp from './screens/senior/RequestHelp';
import SeniorProfile from './screens/senior/SeniorProfile';
import NearbyFeed from './screens/shared/NearbyFeed';
import TimeLedger from './screens/shared/TimeLedger';
import VolunteerHome from './screens/volunteer/VolunteerHome';
import ActiveTask from './screens/volunteer/ActiveTask';
import ImpactDashboard from './screens/volunteer/ImpactDashboard';
import VolunteerProfile from './screens/volunteer/VolunteerProfile';
import AdminDashboard from './screens/admin/AdminDashboard';
import PendingApprovals from './screens/admin/PendingApprovals';
import AdminRequests from './screens/admin/AdminRequests';
import AdminMembers from './screens/admin/AdminMembers';
import AdminProfile from './screens/admin/AdminProfile';
function ProtectedRoute({ children, allowedRoles }) {
  const { isLoggedIn, currentUser } = useApp();
  if (!isLoggedIn) return <Navigate to="/" replace />;
  if (allowedRoles && !allowedRoles.includes(currentUser?.role)) {
    const homeMap = { senior: '/senior/home', volunteer: '/volunteer/home', admin: '/admin/dashboard' };
    return <Navigate to={homeMap[currentUser?.role] || '/'} replace />;
  }
  return children;
}
function AppLayout({ children, showNav = true }) {
  const { seniorMode } = useApp();
  return (
    <div className={seniorMode ? 'senior-mode' : ''}>
      {children}
      {showNav && <BottomNav />}
      <RatingModal />
    </div>
  );
}
function AppRoutes() {
  const { isLoggedIn, currentUser } = useApp();
  return (
    <Routes>
      <Route path="/" element={<WelcomeScreen />} />
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/onboarding" element={<OnboardingFlow />} />
      <Route path="/senior/*" element={
        <ProtectedRoute allowedRoles={[ROLES.SENIOR]}>
          <AppLayout>
            <Routes>
              <Route path="home" element={<SeniorHome />} />
              <Route path="request" element={<RequestHelp />} />
              <Route path="nearby" element={<NearbyFeed role="senior" />} />
              <Route path="ledger" element={<TimeLedger />} />
              <Route path="profile" element={<SeniorProfile />} />
              <Route path="*" element={<Navigate to="home" replace />} />
            </Routes>
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/volunteer/*" element={
        <ProtectedRoute allowedRoles={[ROLES.VOLUNTEER]}>
          <AppLayout>
            <Routes>
              <Route path="home" element={<VolunteerHome />} />
              <Route path="nearby" element={<NearbyFeed role="volunteer" />} />
              <Route path="task" element={<ActiveTask />} />
              <Route path="ledger" element={<TimeLedger />} />
              <Route path="impact" element={<ImpactDashboard />} />
              <Route path="profile" element={<VolunteerProfile />} />
              <Route path="*" element={<Navigate to="home" replace />} />
            </Routes>
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/*" element={
        <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
          <AppLayout>
            <Routes>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="approvals" element={<PendingApprovals />} />
              <Route path="requests" element={<AdminRequests />} />
              <Route path="members" element={<AdminMembers />} />
              <Route path="profile" element={<AdminProfile />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
