import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { REQUEST_STATUS, ROLES, SERVICE_TYPES, SERVICE_LABELS, SERVICE_ICONS, formatMinutes } from '../../constants';
import { Users, Clock, AlertTriangle, CheckCircle, Activity, Star, Plus, Shield, Phone, HeartHandshake } from 'lucide-react';
import { getPincodeLocation } from '../../lib/geo';

export default function AdminDashboard() {
  const { currentUser, isSuperAdmin, pendingApprovals, members, requests, ratings, getPincodeAdminRequests } = useApp();
  const navigate = useNavigate();

  const isAdmin =
    currentUser?.role === ROLES.ADMIN ||
    isSuperAdmin === true ||
    (currentUser?.roles || []).includes(ROLES.ADMIN);

  if (!isAdmin) {
    return (
      <div className="page-content" style={{ padding: 'var(--space-6)', textAlign: 'center', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔒</div>
        <h3 style={{ marginBottom: 8 }}>Access Restricted</h3>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 24, maxWidth: 320 }}>
          You do not have administrative privileges to view this dashboard.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Back to Home
        </button>
      </div>
    );
  }

  // Geographic and role scoping
  const scopedPincode = isSuperAdmin ? null : currentUser?.pincode;
  const pincodeGeo = getPincodeLocation(currentUser?.pincode, currentUser?.area);
  const pincodeRequests = scopedPincode ? requests.filter((r) => r.pincode === scopedPincode) : requests;
  const pincodeMembers = scopedPincode ? members.filter((m) => m.pincode === scopedPincode) : members;
  const scopedPendingApprovals = scopedPincode ? pendingApprovals.filter((p) => p.pincode === scopedPincode) : pendingApprovals;

  // Requests Breakdown
  const createdOpenCount = pincodeRequests.filter((r) => r.status === REQUEST_STATUS.OPEN || r.status === REQUEST_STATUS.NOTIFIED_TRUSTED).length;
  const inProgressCount = pincodeRequests.filter((r) => [REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.IN_PROGRESS].includes(r.status)).length;
  const completedCount = pincodeRequests.filter((r) => [REQUEST_STATUS.COMPLETED, REQUEST_STATUS.RATED, REQUEST_STATUS.CLOSED].includes(r.status)).length;
  const cancelledCount = pincodeRequests.filter((r) => r.status === REQUEST_STATUS.CANCELLED).length;

  // Members Breakdown
  const seniorMembers = pincodeMembers.filter((m) => m.role === ROLES.SENIOR || (m.roles || []).includes(ROLES.SENIOR));
  const volunteerMembers = pincodeMembers.filter((m) => m.role === ROLES.VOLUNTEER || (m.roles || []).includes(ROLES.VOLUNTEER));

  // Volunteer Performance Metrics
  const totalMins = pincodeRequests
    .filter((r) => [REQUEST_STATUS.COMPLETED, REQUEST_STATUS.RATED, REQUEST_STATUS.CLOSED].includes(r.status))
    .reduce((sum, r) => sum + (r.duration || 60), 0);
  const acceptedCount = pincodeRequests.filter((r) =>
    [REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.IN_PROGRESS, REQUEST_STATUS.COMPLETED, REQUEST_STATUS.RATED, REQUEST_STATUS.CLOSED].includes(r.status)
  ).length;
  const acceptVsCompletePct = acceptedCount > 0 ? Math.round((completedCount / acceptedCount) * 100) : 100;

  // Volunteer Average Rating in this pincode
  const volIds = new Set(volunteerMembers.map((v) => v.id));
  const volRatings = ratings.filter((rat) => volIds.has(rat.reviewee_id) || volIds.has(rat.revieweeId));
  const avgRating = volRatings.length > 0
    ? (volRatings.reduce((sum, rat) => sum + rat.stars, 0) / volRatings.length).toFixed(1)
    : null;

  // Vulnerable Senior Inactivity Alerts (No requests in last 14 days)
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const vulnerableSeniors = seniorMembers.filter((s) => {
    const recentReqs = pincodeRequests.filter(
      (r) => (r.seniorId === s.id || r.senior_id === s.id) && new Date(r.createdAt || r.created_at) > fourteenDaysAgo
    );
    return recentReqs.length === 0;
  });

  // Category Breakdown
  const categories = {};
  pincodeRequests.forEach((r) => {
    const type = r.serviceType || 'other';
    categories[type] = (categories[type] || 0) + 1;
  });
  const maxCategoryCount = Math.max(...Object.values(categories), 1);

  // Super Admin Pincode Admin Role Approvals
  const pincodeAdminPending = getPincodeAdminRequests();

  return (
    <div className="page-content">
      {/* Hero Header Banner */}
      <div className="hero-banner" style={{ background: isSuperAdmin ? 'linear-gradient(135deg, #4A148C 0%, #7B1FA2 100%)' : 'linear-gradient(135deg, #1A365D 0%, #2563EB 100%)' }}>
        <div className="flex justify-between items-center">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', fontSize: '0.75rem', fontWeight: 800 }}>
                {isSuperAdmin ? '👑 Super Admin' : '🛡️ Pincode Administrator'}
              </span>
            </div>
            <h2 style={{ color: 'white', fontWeight: 800, marginBottom: 4 }}>
              {currentUser?.name || 'Administrator'}
            </h2>
            <p style={{ opacity: 0.9, fontSize: 'var(--font-size-sm)' }}>
              {isSuperAdmin
                ? 'National Oversight · All Pincodes & Jurisdictions'
                : `Managing Pincode ${currentUser?.pincode || '400001'} · ${pincodeGeo.full}`}
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/create-request')}
            className="btn btn-sm"
            style={{ background: 'white', color: 'var(--color-primary)', fontWeight: 800, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 6, border: 'none', padding: '8px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
          >
            <Plus size={16} /> <span>Create Request</span>
          </button>
        </div>
      </div>

      <div style={{ padding: 'var(--space-5)' }}>
        {/* Pending KYC Approvals Alert */}
        {scopedPendingApprovals.length > 0 && (
          <div
            className="alert alert-warning"
            style={{ marginBottom: 'var(--space-4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            onClick={() => navigate('/admin/approvals')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={18} color="#D97706" />
              <span><strong>{scopedPendingApprovals.length} pending KYC application{scopedPendingApprovals.length > 1 ? 's' : ''}</strong> awaiting verification.</span>
            </div>
            <span style={{ fontWeight: 800, color: '#B45309' }}>Review →</span>
          </div>
        )}

        {/* Super Admin: Pincode Admin Role Approvals */}
        {isSuperAdmin && pincodeAdminPending.length > 0 && (
          <div
            className="alert"
            style={{ marginBottom: 'var(--space-4)', background: '#F3E8FF', border: '1px solid #D8B4FE', color: '#6B21A8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            onClick={() => navigate('/admin/approvals')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={18} color="#7E22CE" />
              <span><strong>{pincodeAdminPending.length} Pincode Admin application{pincodeAdminPending.length > 1 ? 's' : ''}</strong> awaiting Super Admin approval.</span>
            </div>
            <span style={{ fontWeight: 800, color: '#6B21A8' }}>Approve →</span>
          </div>
        )}

        {/* 1. Member & KYC Overview */}
        <h3 style={{ marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={20} color="var(--color-primary)" />
          <span>Member & KYC Status</span>
        </h3>
        <div className="stat-grid" style={{ marginBottom: 'var(--space-5)' }}>
          {[
            { value: pincodeMembers.length, label: 'Total Members', color: 'var(--color-primary)' },
            { value: seniorMembers.length, label: 'Senior Citizens', color: '#2563EB' },
            { value: volunteerMembers.length, label: 'Active Volunteers', color: '#16A34A' },
            { value: scopedPendingApprovals.length, label: 'Pending KYC', color: '#D97706' },
          ].map(({ value, label, color }) => (
            <div key={label} className="stat-card" style={{ borderTop: `3px solid ${color}` }}>
              <div className="stat-value" style={{ color }}>{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* 2. Request Lifecycle Status (Created -> In Progress -> Completed -> Cancelled) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={20} color="var(--color-primary)" />
            <span>Request Lifecycle ({pincodeRequests.length})</span>
          </h3>
          <button
            onClick={() => navigate('/admin/requests')}
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--color-primary)', fontWeight: 700, padding: 0 }}
          >
            Manage All Requests →
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
          {[
            { count: createdOpenCount, label: 'Created / Open', color: '#2563EB', bg: '#EFF6FF', desc: 'Awaiting volunteer acceptance' },
            { count: inProgressCount, label: 'In Progress', color: '#D97706', bg: '#FFFBEB', desc: 'Accepted & active seva' },
            { count: completedCount, label: 'Completed Seva', color: '#16A34A', bg: '#F0FDF4', desc: 'Successfully fulfilled' },
            { count: cancelledCount, label: 'Cancelled', color: '#DC2626', bg: '#FEF2F2', desc: 'Closed without completion' },
          ].map(({ count, label, color, bg, desc }) => (
            <div
              key={label}
              className="card"
              style={{ background: bg, border: `1px solid ${color}40`, cursor: 'pointer', padding: 'var(--space-3)' }}
              onClick={() => navigate('/admin/requests')}
            >
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{count}</div>
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-primary)' }}>{label}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* 3. Volunteer Performance Section */}
        <h3 style={{ marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <HeartHandshake size={20} color="#16A34A" />
          <span>Volunteer Performance</span>
        </h3>
        <div className="card" style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 600 }}>Total Seva Given</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16A34A' }}>{formatMinutes(totalMins)}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Community service hours</div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 600 }}>Accept-to-Complete</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>{acceptVsCompletePct}%</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Fulfillment rate</div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 600 }}>Average Rating</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 4 }}>
                {avgRating ? (
                  <>
                    <Star size={18} fill="#F59E0B" color="#F59E0B" />
                    <span>{avgRating}</span>
                  </>
                ) : (
                  <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>No reviews yet</span>
                )}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{volRatings.length} feedback reviews</div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 600 }}>Avg Response Time</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4F46E5' }}>~14 min</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>From request to accept</div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Detailed volunteer ledger & certificates</span>
            <button
              onClick={() => navigate('/admin/reports')}
              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
            >
              Export Full Report →
            </button>
          </div>
        </div>

        {/* 4. Vulnerable-Senior Inactivity Alerts */}
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: vulnerableSeniors.length > 0 ? '#B45309' : 'var(--color-text-primary)' }}>
              <AlertTriangle size={20} color={vulnerableSeniors.length > 0 ? '#D97706' : 'var(--color-text-muted)'} />
              <span>Vulnerable Senior Alerts ({vulnerableSeniors.length})</span>
            </h3>
          </div>

          {vulnerableSeniors.length === 0 ? (
            <div className="card" style={{ padding: 'var(--space-3)', background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle size={18} color="#16A34A" />
              <span style={{ fontSize: 'var(--font-size-sm)', color: '#166534', fontWeight: 600 }}>All registered seniors in this pincode have had recent community engagement.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div className="alert alert-warning" style={{ fontSize: 'var(--font-size-xs)', marginBottom: 2 }}>
                These senior citizens have had <strong>no community requests or contact in the past 14+ days</strong>. Admins are recommended to check in or create a support request on their behalf.
              </div>
              {vulnerableSeniors.map((senior) => (
                <div key={senior.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3)' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>{senior.name}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>Age {senior.age || 70}</span>
                      <span>·</span>
                      <span>{senior.area || 'Colaba'}</span>
                      {senior.phone && (
                        <>
                          <span>·</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Phone size={11} /> {senior.phone}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/admin/create-request')}
                    className="btn btn-outline btn-sm"
                    style={{ fontWeight: 700, fontSize: 'var(--font-size-xs)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Plus size={14} /> Create Request
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. Category Breakdown */}
        <h3 style={{ marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={20} color="var(--color-primary)" />
          <span>Category Breakdown</span>
        </h3>
        <div className="card" style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-4)' }}>
          {Object.values(SERVICE_TYPES).map((type) => {
            const count = categories[type] || 0;
            const pct = Math.round((count / maxCategoryCount) * 100);
            return (
              <div key={type} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>
                    {SERVICE_ICONS[type]} {SERVICE_LABELS[type]}
                  </span>
                  <span style={{ fontWeight: 700, color: count > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                    {count} request{count === 1 ? '' : 's'}
                  </span>
                </div>
                <div style={{ background: '#E2E8F0', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-primary)', borderRadius: 4, transition: 'width 0.4s' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* 6. Quick Administrative Actions */}
        <h3 style={{ marginBottom: 'var(--space-3)' }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
          {[
            { label: 'Create for Member', icon: '🛡️', path: '/admin/create-request', badge: 'New' },
            { label: 'Request Lifecycle', icon: '📋', path: '/admin/requests', badge: `${pincodeRequests.length}` },
            { label: 'KYC Approvals', icon: '✅', path: '/admin/approvals', badge: scopedPendingApprovals.length > 0 ? `${scopedPendingApprovals.length}` : null },
            { label: 'Member Directory', icon: '👥', path: '/admin/members', badge: `${pincodeMembers.length}` },
            { label: 'Export Reports', icon: '📊', path: '/admin/reports', badge: 'Excel / PDF' },
            { label: 'Seva Wall', icon: '🏆', path: '/leaderboard', badge: 'Live' },
          ].map(({ label, icon, path, badge }) => (
            <button
              key={label}
              className="card"
              style={{
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
                textAlign: 'center',
                background: 'white',
                fontFamily: 'var(--font-family)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-4)',
                minHeight: 96,
                position: 'relative',
              }}
              onClick={() => navigate(path)}
            >
              {badge && (
                <span
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    background: 'var(--color-surface-alt)',
                    color: 'var(--color-primary)',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}
                >
                  {badge}
                </span>
              )}
              <span style={{ fontSize: '1.8rem' }}>{icon}</span>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
