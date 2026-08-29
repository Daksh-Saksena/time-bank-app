import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { ROLES } from '../../constants';
import {
  Home,
  PlusCircle,
  MapPin,
  Clock,
  User,
  Zap,
  BarChart3,
  LayoutDashboard,
  CheckSquare,
  ClipboardList,
  Users,
} from 'lucide-react';

export default function BottomNav() {
  const { currentUser, seniorMode } = useApp();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const iconSize = seniorMode ? 24 : 20;

  const NAV_ITEMS = {
    [ROLES.SENIOR]: [
      { path: '/senior/home', icon: <Home size={iconSize} />, labelKey: 'home', label: 'Home' },
      { path: '/senior/request', icon: <PlusCircle size={iconSize} />, labelKey: 'request', label: 'Request' },
      { path: '/senior/nearby', icon: <MapPin size={iconSize} />, labelKey: 'nearby', label: 'Nearby' },
      { path: '/senior/ledger', icon: <Clock size={iconSize} />, labelKey: 'time', label: 'Time' },
      { path: '/senior/profile', icon: <User size={iconSize} />, labelKey: 'profile', label: 'Profile' },
    ],
    [ROLES.VOLUNTEER]: [
      { path: '/volunteer/home', icon: <Home size={iconSize} />, labelKey: 'home', label: 'Home' },
      { path: '/volunteer/nearby', icon: <MapPin size={iconSize} />, labelKey: 'requests', label: 'Requests' },
      { path: '/volunteer/task', icon: <Zap size={iconSize} />, labelKey: 'active', label: 'Active' },
      { path: '/volunteer/ledger', icon: <Clock size={iconSize} />, labelKey: 'time', label: 'Time' },
      { path: '/volunteer/impact', icon: <BarChart3 size={iconSize} />, labelKey: 'impact', label: 'Impact' },
      { path: '/volunteer/profile', icon: <User size={iconSize} />, labelKey: 'profile', label: 'Profile' },
    ],
    [ROLES.ADMIN]: [
      { path: '/admin/dashboard', icon: <LayoutDashboard size={iconSize} />, labelKey: 'dashboard', label: 'Dashboard' },
      { path: '/admin/approvals', icon: <CheckSquare size={iconSize} />, labelKey: 'approvals', label: 'Approvals' },
      { path: '/admin/requests', icon: <ClipboardList size={iconSize} />, labelKey: 'requests', label: 'Requests' },
      { path: '/admin/members', icon: <Users size={iconSize} />, labelKey: 'members', label: 'Members' },
      { path: '/admin/profile', icon: <User size={iconSize} />, labelKey: 'profile', label: 'Profile' },
    ],
  };

  const items = NAV_ITEMS[currentUser?.role] || [];

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {items.map((item) => {
        const isActive =
          location.pathname === item.path ||
          (item.path !== '/' && location.pathname.startsWith(item.path + '/'));
        const labelText = t(item.labelKey, item.label);
        return (
          <button
            key={item.path}
            className={`nav-item${isActive ? ' active' : ''}`}
            onClick={() => navigate(item.path)}
            aria-label={labelText}
            aria-current={isActive ? 'page' : undefined}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 2,
              }}
              aria-hidden="true"
            >
              {item.icon}
            </span>
            <span style={{ fontSize: '0.72rem', fontWeight: isActive ? 700 : 500 }}>
              {labelText}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
