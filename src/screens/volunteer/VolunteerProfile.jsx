import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StarRating from '../../components/common/StarRating';
import { formatMinutes, KYC_STATUS, DEMO_ACCOUNTS } from '../../data/mockData';
export default function VolunteerProfile() {
  const { currentUser, logout, seniorMode, toggleSeniorMode, login, getUserRatings } = useApp();
  const navigate = useNavigate();
  const ratings = getUserRatings();
  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-inner">
          <h2 className="page-title">Profile</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => { logout(); navigate('/'); }}>Sign Out</button>
        </div>
      </div>
      <div style={{ padding: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
          <div className="avatar avatar-lg" style={{ background: '#27AE60' }}>
            {currentUser?.name?.[0]}
          </div>
          <div>
            <h3 style={{ marginBottom: 4 }}>{currentUser?.name}</h3>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 8 }}>
              Volunteer · {currentUser?.area}
            </div>
            <div className="flex items-center gap-2">
              <StarRating value={currentUser?.rating || 0} readonly size="sm" />
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                {(currentUser?.rating || 0).toFixed(1)} ({currentUser?.ratingCount || 0} reviews)
              </span>
            </div>
          </div>
        </div>
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="flex justify-between items-center">
            <div style={{ fontWeight: 600 }}>Identity Verification</div>
            <span className={`badge ${currentUser?.kyc?.status === KYC_STATUS.VERIFIED ? 'badge-kyc-verified' : 'badge-kyc-pending'}`}>
              {currentUser?.kyc?.status === KYC_STATUS.VERIFIED ? '✓ Verified' : ' Pending'}
            </span>
          </div>
        </div>
        <div className="stat-grid" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="stat-card">
            <div className="stat-value">{formatMinutes(currentUser?.volunteerStats?.hoursVolunteered || 0)}</div>
            <div className="stat-label">Time Given</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{currentUser?.volunteerStats?.tasksCompleted || 0}</div>
            <div className="stat-label">Tasks</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatMinutes(currentUser?.timeBalance || 0)}</div>
            <div className="stat-label">My Balance</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{currentUser?.volunteerStats?.peopleHelped || 0}</div>
            <div className="stat-label">Helped</div>
          </div>
        </div>
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <h4 style={{ marginBottom: 'var(--space-4)' }}>Settings</h4>
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Availability</div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Show as available for tasks</div>
            </div>
            <button
              style={{ width: 52, height: 28, borderRadius: 14, background: 'var(--color-success)', border: 'none', cursor: 'pointer', position: 'relative' }}
              aria-label="Toggle availability"
            >
              <span style={{ position: 'absolute', top: 3, left: 27, width: 22, height: 22, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
            </button>
          </div>
          <div className="divider" />
          {[
            { icon: '', label: 'Notifications' },
            { icon: '', label: 'Task History' },
            { icon: '', label: 'Help & Support' },
          ].map(({ icon, label }) => (
            <button key={label} className="flex items-center gap-3" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--space-2) 0', width: '100%', textAlign: 'left', fontFamily: 'var(--font-family)', fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)', minHeight: 'var(--touch-min)' }}>
              <span style={{ fontSize: '1.3rem' }}>{icon}</span>
              <span>{label}</span>
              <span style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }}>›</span>
            </button>
          ))}
        </div>
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <h4 style={{ marginBottom: 'var(--space-3)' }}> Demo: Switch Role</h4>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {DEMO_ACCOUNTS.map((a) => (
              <button key={a.userId} className="btn btn-ghost" style={{ flex: 1, flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-xs)', padding: 'var(--space-3) var(--space-2)' }}
                onClick={() => { login(a.userId); const r = { senior: '/senior/home', volunteer: '/volunteer/home', admin: '/admin/dashboard' }; navigate(r[a.role]); }}>
                <span style={{ fontSize: '1.5rem' }}>{a.emoji}</span>
                <span>{a.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
