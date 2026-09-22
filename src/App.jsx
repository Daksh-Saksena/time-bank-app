import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { LanguageProvider } from './context/LanguageContext';
import { ROLES, getRoleLabel } from './constants';
import BottomNav from './components/common/BottomNav';
import RatingModal from './components/common/RatingModal';
import LanguageModal from './components/common/LanguageModal';
import NotificationBell from './components/common/NotificationBell';
import RoleSwitcherModal from './components/common/RoleSwitcherModal';

// Auth
import WelcomeScreen from './screens/auth/WelcomeScreen';
import LoginScreen from './screens/auth/LoginScreen';
import OnboardingFlow from './screens/auth/OnboardingFlow';

// Senior
import SeniorHome from './screens/senior/SeniorHome';
import RequestHelp from './screens/senior/RequestHelp';
import SeniorProfile from './screens/senior/SeniorProfile';

// Shared
import NearbyFeed from './screens/shared/NearbyFeed';
import TimeLedger from './screens/shared/TimeLedger';
import Leaderboard from './screens/shared/Leaderboard';
import TrustedCircle from './screens/shared/TrustedCircle';

// Volunteer
import VolunteerHome from './screens/volunteer/VolunteerHome';
import ActiveTask from './screens/volunteer/ActiveTask';
import ImpactDashboard from './screens/volunteer/ImpactDashboard';
import VolunteerProfile from './screens/volunteer/VolunteerProfile';

// Admin
import AdminDashboard from './screens/admin/AdminDashboard';
import PendingApprovals from './screens/admin/PendingApprovals';
import AdminRequests from './screens/admin/AdminRequests';
import AdminMembers from './screens/admin/AdminMembers';
import AdminProfile from './screens/admin/AdminProfile';
import AdminReports from './screens/admin/AdminReports';
import AdminCreateRequest from './screens/admin/AdminCreateRequest';

function ProtectedRoute({ children, allowedRoles }) {
  const { isLoggedIn, currentUser, loading } = useApp();
  if (loading && !currentUser) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--color-primary)', fontWeight: 600 }}>
        Loading...
      </div>
    );
  }
  if (!isLoggedIn && !currentUser) return <Navigate to="/" replace />;

  if (allowedRoles) {
    const userRoles = [
      currentUser?.role,
      currentUser?.active_role,
      ...(currentUser?.roles || []),
    ].filter(Boolean);

    if (currentUser?.is_super_admin) {
      userRoles.push('admin', 'super_admin');
    }

    const hasAccess = allowedRoles.some((r) => userRoles.includes(r));
    if (!hasAccess) {
      const homeMap = {
        senior: '/senior/home',
        volunteer: '/volunteer/home',
        admin: '/admin/dashboard',
        super_admin: '/admin/dashboard',
      };
      const fallback = currentUser?.active_role || currentUser?.role || 'senior';
      return <Navigate to={homeMap[fallback] || '/'} replace />;
    }
  }

  return children;
}

function AppLayout({ children, showNav = true }) {
  const { seniorMode, currentUser } = useApp();
  const [roleSwitchOpen, setRoleSwitchOpen] = useState(false);
  const roles = currentUser?.roles || [currentUser?.role || 'senior'];
  const showRoleSwitcher = roles.length > 1;

  return (
    <div className={seniorMode ? 'senior-mode' : ''} style={{ position: 'relative' }}>
      {/* Floating header utilities: NotificationBell + RoleSwitcher */}
      {currentUser && (
        <div style={{
          position: 'fixed', top: 'env(safe-area-inset-top, 0)', right: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
          pointerEvents: 'none',
        }}>
          <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {showRoleSwitcher && (
              <button
                onClick={() => setRoleSwitchOpen(true)}
                aria-label="Switch Role"
                style={{
                  background: 'var(--color-primary)', border: 'none', borderRadius: 'var(--radius-full)',
                  padding: '6px 12px', cursor: 'pointer', color: 'white', fontSize: 'var(--font-size-xs)',
                  fontWeight: 700, fontFamily: 'var(--font-family)', display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <span>{getRoleLabel(currentUser.active_role || currentUser.role)}</span> ⇄
              </button>
            )}
            <NotificationBell />
          </div>
        </div>
      )}

      {children}
      {showNav && <BottomNav />}
      <RatingModal />
      <LanguageModal />
      {roleSwitchOpen && (
        <RoleSwitcherModal isOpen={roleSwitchOpen} onClose={() => setRoleSwitchOpen(false)} />
      )}
    </div>
  );
}

function AppRoutes() {
  const { isLoggedIn, currentUser } = useApp();
  return (
    <Routes>
      <Route
        path="/"
        element={
          isLoggedIn && currentUser ? (
            <Navigate
              to={
                currentUser.role === ROLES.VOLUNTEER
                  ? '/volunteer/home'
                  : currentUser.role === ROLES.ADMIN || currentUser.role === ROLES.SUPER_ADMIN
                  ? '/admin/dashboard'
                  : '/senior/home'
              }
              replace
            />
          ) : (
            <WelcomeScreen />
          )
        }
      />
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/onboarding" element={<OnboardingFlow />} />

      {/* Shared routes (accessible to all logged-in users) */}
      <Route path="/leaderboard" element={
        <ProtectedRoute allowedRoles={[ROLES.SENIOR, ROLES.VOLUNTEER, ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
          <AppLayout><Leaderboard /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Senior routes */}
      <Route path="/senior/*" element={
        <ProtectedRoute allowedRoles={[ROLES.SENIOR]}>
          <AppLayout>
            <Routes>
              <Route path="home" element={<SeniorHome />} />
              <Route path="request" element={<RequestHelp />} />
              <Route path="my-requests" element={<NearbyFeed role="senior" />} />
              <Route path="nearby" element={<NearbyFeed role="senior" />} />
              <Route path="ledger" element={<TimeLedger />} />
              <Route path="profile" element={<SeniorProfile />} />
              <Route path="trusted-circle" element={<TrustedCircle />} />
              <Route path="*" element={<Navigate to="home" replace />} />
            </Routes>
          </AppLayout>
        </ProtectedRoute>
      } />

      {/* Volunteer routes */}
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
              <Route path="trusted-circle" element={<TrustedCircle forRole="volunteer" />} />
              <Route path="*" element={<Navigate to="home" replace />} />
            </Routes>
          </AppLayout>
        </ProtectedRoute>
      } />

      {/* Admin routes */}
      <Route path="/admin/*" element={
        <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
          <AppLayout>
            <Routes>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="approvals" element={<PendingApprovals />} />
              <Route path="requests" element={<AdminRequests />} />
              <Route path="members" element={<AdminMembers />} />
              <Route path="profile" element={<AdminProfile />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="create-request" element={<AdminCreateRequest />} />
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
    <LanguageProvider>
      <AppProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </LanguageProvider>
  );
}
