import { useApp } from '../../context/AppContext';
import { formatMinutes } from '../../data/mockData';
import StarRating from '../../components/common/StarRating';
function MiniBar({ value, max, color }) {
  return (
    <div style={{ background: 'var(--color-surface-alt)', borderRadius: 4, height: 8, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ width: `${(value / max) * 100}%`, background: color, height: '100%', borderRadius: 4, transition: 'width 0.8s ease' }} />
    </div>
  );
}
export default function ImpactDashboard() {
  const { currentUser, getUserLedger, getUserRatings } = useApp();
  const stats = currentUser?.volunteerStats || {};
  const ledger = getUserLedger();
  const ratings = getUserRatings();
  const avgRating = ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length).toFixed(1)
    : currentUser?.rating?.toFixed(1) || '—';
  const serviceBreakdown = ledger.reduce((acc, txn) => {
    if (txn.type === 'credit' && txn.service) {
      acc[txn.service] = (acc[txn.service] || 0) + txn.minutes;
    }
    return acc;
  }, {});
  const maxService = Math.max(...Object.values(serviceBreakdown), 1);
  const serviceColors = { medicine: '#E74C3C', groceries: '#27AE60', bank: '#2980B9', walk: '#E67E22', other: '#8E44AD' };
  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <h2 className="page-title">My Impact</h2>
            <p className="page-subtitle">Your contribution to the community</p>
          </div>
        </div>
      </div>
      <div style={{ padding: 'var(--space-5)' }}>
        <div style={{
          background: 'linear-gradient(135deg, #1B4F72 0%, #2E86AB 100%)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          color: 'white',
          marginBottom: 'var(--space-5)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1 }}>
            {formatMinutes(stats.hoursVolunteered || 0)}
          </div>
          <div style={{ opacity: 0.8, fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)' }}>
            Total Time Volunteered
          </div>
          <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'space-around' }}>
            {[
              { value: stats.peopleHelped || 0, label: 'People Helped' },
              { value: stats.tasksCompleted || 0, label: 'Tasks Done' },
              { value: `${avgRating} `, label: 'Avg Rating' },
            ].map(({ value, label }) => (
              <div key={label}>
                <div style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>{value}</div>
                <div style={{ opacity: 0.7, fontSize: 'var(--font-size-xs)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
        {Object.keys(serviceBreakdown).length > 0 && (
          <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
            <h4 style={{ marginBottom: 'var(--space-4)' }}>What you helped with</h4>
            {Object.entries(serviceBreakdown).map(([service, mins]) => (
              <div key={service} style={{ marginBottom: 'var(--space-3)' }}>
                <div className="flex justify-between">
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, textTransform: 'capitalize' }}>
                    {service === 'medicine' ? '' : service === 'groceries' ? '' : service === 'bank' ? '' : service === 'walk' ? '' : ''} {service}
                  </span>
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{formatMinutes(mins)}</span>
                </div>
                <MiniBar value={mins} max={maxService} color={serviceColors[service] || '#888'} />
              </div>
            ))}
          </div>
        )}
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <h4 style={{ marginBottom: 'var(--space-4)' }}>Milestones</h4>
          {[
            { icon: '', label: 'First Task', unlocked: (stats.tasksCompleted || 0) >= 1 },
            { icon: '', label: '5 Tasks Completed', unlocked: (stats.tasksCompleted || 0) >= 5 },
            { icon: '', label: '10 People Helped', unlocked: (stats.peopleHelped || 0) >= 10 },
            { icon: '', label: '10+ Hours Volunteered', unlocked: (stats.hoursVolunteered || 0) >= 600 },
            { icon: '', label: '25 Tasks Completed', unlocked: (stats.tasksCompleted || 0) >= 25 },
          ].map(({ icon, label, unlocked }) => (
            <div key={label} className="flex items-center gap-3" style={{ padding: 'var(--space-3) 0', borderBottom: '1px solid var(--color-border)', opacity: unlocked ? 1 : 0.4 }}>
              <span style={{ fontSize: '1.5rem' }}>{unlocked ? icon : ''}</span>
              <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{label}</span>
              {unlocked && <span className="badge badge-normal" style={{ marginLeft: 'auto' }}>Unlocked</span>}
            </div>
          ))}
        </div>
        {ratings.length > 0 && (
          <div className="card">
            <h4 style={{ marginBottom: 'var(--space-4)' }}>Recent Reviews</h4>
            {ratings.slice(0, 3).map((r) => (
              <div key={r.id} style={{ marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="avatar avatar-sm">{r.reviewerName?.[0]}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{r.reviewerName}</div>
                    <StarRating value={r.stars} readonly size="sm" />
                  </div>
                </div>
                {r.review && <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>"{r.review}"</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
