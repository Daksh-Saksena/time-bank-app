import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StarRating from '../../components/common/StarRating';
import { KYC_STATUS, formatMinutes } from '../../data/mockData';
import { DEMO_ACCOUNTS } from '../../data/mockData';
function kycBadgeClass(status) {
  const m = { verified: 'badge-kyc-verified', pending: 'badge-kyc-pending', rejected: 'badge-kyc-rejected', not_started: 'badge-status-cancelled' };
  return m[status] || '';
}
export default function SeniorProfile() {
  const { currentUser, logout, seniorMode, toggleSeniorMode, login } = useApp();
  const navigate = useNavigate();
  const ratings = [];
  const avgRating = currentUser?.rating || 0;
  function handleLogout() {
    logout();
    navigate('/');
  }
  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-inner">
          <h2 className="page-title">Profile</h2>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Sign Out</button>
        </div>
      </div>
      <div style={{ padding: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
          <div className="avatar avatar-lg" style={{ background: 'var(--color-primary)', flexShrink: 0 }}>
            {currentUser?.name?.[0] || '?'}
          </div>
          <div>
            <h3 style={{ marginBottom: 4 }}>{currentUser?.name}</h3>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 8 }}>
              {currentUser?.area} · {currentUser?.pincode}
            </div>
            <div className="flex items-center gap-2">
              <StarRating value={avgRating} readonly size="sm" />
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                {avgRating.toFixed(1)} ({currentUser?.ratingCount || 0} reviews)
              </span>
            </div>
          </div>
        </div>
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="flex justify-between items-center">
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Identity Verification</div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                {currentUser?.kyc?.documentType || 'Aadhaar Card'} ****{currentUser?.kyc?.aadhaarLast4}
              </div>
            </div>
            <span className={`badge ${kycBadgeClass(currentUser?.kyc?.status)}`}>
              {currentUser?.kyc?.status === KYC_STATUS.VERIFIED ? '✓ Verified' :
                currentUser?.kyc?.status === KYC_STATUS.PENDING ? ' Pending' : '✗ Rejected'}
            </span>
          </div>
          {currentUser?.kyc?.verifiedOn && (
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
              Verified on {currentUser.kyc.verifiedOn}
            </div>
          )}
        </div>
        <div className="card" style={{ marginBottom: 'var(--space-4)', background: 'var(--color-primary)', color: 'white' }}>
          <p style={{ opacity: 0.8, fontSize: 'var(--font-size-sm)', marginBottom: 4 }}>Time Balance</p>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>{formatMinutes(currentUser?.timeBalance || 0)}</div>
          <p style={{ opacity: 0.8, fontSize: 'var(--font-size-xs)', marginTop: 4 }}>Member since {currentUser?.memberSince}</p>
        </div>
        {currentUser?.emergencyContact && (
          <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}> Emergency Contact</div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>
              {currentUser.emergencyContact.name}
            </div>
            <a href={`tel:${currentUser.emergencyContact.phone}`} className="btn btn-outline btn-sm" style={{ display: 'inline-flex' }}>
              {currentUser.emergencyContact.phone}
            </a>
          </div>
        )}
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <h4 style={{ marginBottom: 'var(--space-4)' }}>Settings</h4>
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Senior Citizen Mode</div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Larger text, buttons, and simpler navigation</div>
            </div>
            <button
              onClick={toggleSeniorMode}
              style={{
                width: 52,
                height: 28,
                borderRadius: 14,
                background: seniorMode ? 'var(--color-primary)' : 'var(--color-border)',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
              aria-label="Toggle senior mode"
              aria-checked={seniorMode}
              role="switch"
            >
              <span style={{
                position: 'absolute',
                top: 3,
                left: seniorMode ? 27 : 3,
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'white',
                transition: 'left 0.2s',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
          <div className="divider" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[
              { icon: '', label: 'Notifications' },
              { icon: '', label: 'Change PIN' },
              { icon: '', label: 'My Requests' },
              { icon: '', label: 'Help & Support' },
            ].map(({ icon, label }) => (
              <button
                key={label}
                className="flex items-center gap-3"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--space-2) 0', width: '100%', textAlign: 'left', fontFamily: 'var(--font-family)', fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)', minHeight: 'var(--touch-min)' }}
              >
                <span style={{ fontSize: '1.3rem' }}>{icon}</span>
                <span>{label}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }}>›</span>
              </button>
            ))}
          </div>
        </div>
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <h4 style={{ marginBottom: 'var(--space-3)' }}> Demo: Switch Role</h4>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.userId}
                className="btn btn-ghost"
                style={{ flex: 1, flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-xs)', padding: 'var(--space-3) var(--space-2)' }}
                onClick={() => { login(a.userId); const r = { senior: '/senior/home', volunteer: '/volunteer/home', admin: '/admin/dashboard' }; navigate(r[a.role]); }}
              >
                <span style={{ fontSize: '1.5rem' }}>{a.emoji}</span>
                <span>{a.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
        <button className="btn btn-ghost btn-full" onClick={handleLogout} style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
          Sign Out
        </button>
      </div>
    </div>
  );
}
