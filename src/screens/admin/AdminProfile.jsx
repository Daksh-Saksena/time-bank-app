import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { DEMO_ACCOUNTS, formatMinutes, KYC_STATUS } from '../../data/mockData';
export default function AdminProfile() {
  const { currentUser, logout, login, requests, members } = useApp();
  const navigate = useNavigate();
  const recentActivity = requests
    .filter((r) => r.completedAt || r.status === 'completed')
    .slice(0, 5);
  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-inner">
          <h2 className="page-title">Admin Profile</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => { logout(); navigate('/'); }}>Sign Out</button>
        </div>
      </div>
      <div style={{ padding: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
          <div className="avatar avatar-lg" style={{ background: '#8E44AD' }}></div>
          <div>
            <h3 style={{ marginBottom: 4 }}>{currentUser?.name}</h3>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
              Pincode Admin · 400001 Colaba
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              Admin since {currentUser?.adminSince || currentUser?.memberSince}
            </div>
          </div>
        </div>
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="flex justify-between items-center">
            <div style={{ fontWeight: 600 }}>Identity Verification</div>
            <span className="badge badge-kyc-verified">✓ Verified</span>
          </div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: 4 }}>
            Aadhaar ****{currentUser?.kyc?.aadhaarLast4}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
          {[
            { value: members.length, label: 'Members' },
            { value: requests.filter(r => r.status === 'completed').length, label: 'Completed' },
            { value: formatMinutes(currentUser?.timeBalance || 0), label: 'My Balance' },
          ].map(({ value, label }) => (
            <div key={label} className="stat-card">
              <div className="stat-value" style={{ fontSize: 'var(--font-size-xl)' }}>{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <h4 style={{ marginBottom: 'var(--space-4)' }}>Recent Activity</h4>
          {recentActivity.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No recent completed tasks.</p>
          ) : (
            recentActivity.map((req) => (
              <div key={req.id} className="flex items-center gap-3" style={{ padding: 'var(--space-3) 0', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '1.3rem' }}></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                    {req.serviceType} — {req.seniorName}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                    By {req.assignedVolunteerName || 'Unknown'} · {req.duration ? formatMinutes(req.duration) : '—'}
                  </div>
                </div>
              </div>
            ))
          )}
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
        <button className="btn btn-ghost btn-full" onClick={() => { logout(); navigate('/'); }} style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
          Sign Out
        </button>
      </div>
    </div>
  );
}
