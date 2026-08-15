import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ROLES } from '../../data/mockData';
const NAV_ITEMS = {
  [ROLES.SENIOR]: [
    { path: '/senior/home', icon: '', label: 'Home' },
    { path: '/senior/request', icon: '', label: 'Request' },
    { path: '/senior/nearby', icon: '', label: 'Nearby' },
    { path: '/senior/ledger', icon: <img src="/logo.png" alt="Time" style={{ width: '1em', height: '1em', verticalAlign: 'middle' }} />, label: 'Time' },
    { path: '/senior/profile', icon: '', label: 'Profile' },
  ],
  [ROLES.VOLUNTEER]: [
    { path: '/volunteer/home', icon: '', label: 'Home' },
    { path: '/volunteer/nearby', icon: '', label: 'Requests' },
    { path: '/volunteer/task', icon: '', label: 'Active' },
    { path: '/volunteer/ledger', icon: <img src="/logo.png" alt="Time" style={{ width: '1em', height: '1em', verticalAlign: 'middle' }} />, label: 'Time' },
    { path: '/volunteer/impact', icon: '', label: 'Impact' },
    { path: '/volunteer/profile', icon: '', label: 'Profile' },
  ],
  [ROLES.ADMIN]: [
    { path: '/admin/dashboard', icon: '', label: 'Dashboard' },
    { path: '/admin/approvals', icon: '', label: 'Approvals' },
    { path: '/admin/requests', icon: '', label: 'Requests' },
    { path: '/admin/members', icon: '', label: 'Members' },
    { path: '/admin/profile', icon: '', label: 'Profile' },
  ],
};
export default function BottomNav() {
  const { currentUser, seniorMode } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const items = NAV_ITEMS[currentUser?.role] || [];
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {items.map((item) => {
        const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
        return (
          <button
            key={item.path}
            className={`nav-item${isActive ? ' active' : ''}`}
            onClick={() => navigate(item.path)}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <span style={{ fontSize: seniorMode ? '1.5rem' : '1.3rem' }} aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
