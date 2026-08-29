import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { REQUEST_STATUS, ROLES } from '../../constants';
export default function AdminDashboard() {
  const { currentUser, pendingApprovals, members, requests } = useApp();
  const navigate = useNavigate();
  const openCount = requests.filter((r) => r.status === REQUEST_STATUS.OPEN).length;
  const inProgressCount = requests.filter((r) => r.status === REQUEST_STATUS.IN_PROGRESS).length;
  const completedCount = requests.filter((r) => r.status === REQUEST_STATUS.COMPLETED).length;
  const seniorCount = members.filter((m) => m.role === ROLES.SENIOR).length;
  const volunteerCount = members.filter((m) => m.role === ROLES.VOLUNTEER).length;
  return (
    <div className="page-content">
      <div className="hero-banner">
        <div className="flex justify-between items-center">
          <div>
            <p style={{ opacity: 0.8, fontSize: 'var(--font-size-sm)', marginBottom: 4 }}>Pincode Admin</p>
            <h2 style={{ color: 'white', fontWeight: 800, marginBottom: 4 }}>
              {currentUser?.name?.split(' ')[0]}
            </h2>
            <p style={{ opacity: 0.8, fontSize: 'var(--font-size-sm)' }}>
              {currentUser?.pincode
                ? `Managing Pincode ${currentUser.pincode}${currentUser.area ? ` · ${currentUser.area}` : ''}`
                : 'Pincode Administrator'}
            </p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
          </div>
        </div>
      </div>
      <div style={{ padding: 'var(--space-5)' }}>
        {pendingApprovals.length > 0 && (
          <div
            className="alert alert-warning"
            style={{ marginBottom: 'var(--space-4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            onClick={() => navigate('/admin/approvals')}
          >
            <span> <strong>{pendingApprovals.length} pending approval{pendingApprovals.length > 1 ? 's' : ''}</strong> waiting for review.</span>
            <span style={{ fontWeight: 700 }}>Review →</span>
          </div>
        )}
        <h3 style={{ marginBottom: 'var(--space-4)' }}>Pincode Overview</h3>
        <div className="stat-grid" style={{ marginBottom: 'var(--space-5)' }}>
          {[
            { value: members.length, label: 'Total Members', icon: '' },
            { value: seniorCount, label: 'Seniors', icon: '' },
            { value: volunteerCount, label: 'Volunteers', icon: '' },
            { value: pendingApprovals.length, label: 'Pending KYC', icon: '' },
          ].map(({ value, label, icon }) => (
            <div key={label} className="stat-card">
              <div style={{ fontSize: '1.5rem', marginBottom: 'var(--space-1)' }}>{icon}</div>
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>
        <h3 style={{ marginBottom: 'var(--space-4)' }}>Request Activity</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
          {[
            { count: openCount, label: 'Open Requests', color: 'var(--color-primary)', bg: '#EBF5FB', icon: '' },
            { count: inProgressCount, label: 'In Progress', color: 'var(--color-accent)', bg: '#FEF5E7', icon: '' },
            { count: completedCount, label: 'Completed This Week', color: 'var(--color-success)', bg: 'var(--color-success-bg)', icon: '' },
          ].map(({ count, label, color, bg, icon }) => (
            <div
              key={label}
              className="card"
              style={{ background: bg, border: `1px solid ${color}`, cursor: 'pointer' }}
              onClick={() => navigate('/admin/requests')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: '1.5rem' }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color, lineHeight: 1 }}>{count}</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{label}</div>
                  </div>
                </div>
                <span style={{ color, fontWeight: 700 }}>→</span>
              </div>
            </div>
          ))}
        </div>
        <h3 style={{ marginBottom: 'var(--space-4)' }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          {[
            { label: 'Review Approvals', icon: '', path: '/admin/approvals' },
            { label: 'View Members', icon: '', path: '/admin/members' },
            { label: 'All Requests', icon: '', path: '/admin/requests' },
            { label: 'Activity Log', icon: '', path: '/admin/profile' },
          ].map(({ label, icon, path }) => (
            <button
              key={label}
              className="card"
              style={{ border: '1px solid var(--color-border)', cursor: 'pointer', textAlign: 'center', background: 'none', fontFamily: 'var(--font-family)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-4)', minHeight: 90 }}
              onClick={() => navigate(path)}
            >
              <span style={{ fontSize: '1.8rem' }}>{icon}</span>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
