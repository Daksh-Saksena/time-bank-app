import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatMinutes } from '../../constants';
import StarRating from '../../components/common/StarRating';
import { ArrowLeft, HeartHandshake, CheckCircle2, Users, Star, Award, Calendar } from 'lucide-react';

function MiniBar({ value, max, color }) {
  return (
    <div style={{ background: 'var(--color-surface-alt)', borderRadius: 4, height: 8, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ width: `${Math.min(100, Math.max(8, (value / max) * 100))}%`, background: color, height: '100%', borderRadius: 4, transition: 'width 0.8s ease' }} />
    </div>
  );
}

export default function ImpactDashboard() {
  const { currentUser, getVolunteerMetrics, getUserLedger, getUserRatings } = useApp();
  const navigate = useNavigate();

  const metrics = getVolunteerMetrics();
  const ledger = getUserLedger();
  const ratings = getUserRatings();

  // Breakdown from completed tasks
  const serviceBreakdown = (metrics.completedTasks || []).reduce((acc, task) => {
    const s = task.serviceType || 'other';
    acc[s] = (acc[s] || 0) + (task.duration || 60);
    return acc;
  }, {});

  const maxService = Math.max(...Object.values(serviceBreakdown), 1);
  const serviceColors = {
    medicine: '#E74C3C',
    grocery: '#27AE60',
    groceries: '#27AE60',
    hospital: '#2980B9',
    tech: '#8E44AD',
    walk: '#E67E22',
    companionship: '#F39C12',
    other: '#16A34A',
  };

  return (
    <div className="page-content" style={{ paddingBottom: 80 }}>
      {/* Top Header */}
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #1B4F72 0%, #2E86AB 100%)', color: 'white' }}>
        <div className="page-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: 38,
                height: 38,
                cursor: 'pointer',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="page-title" style={{ color: 'white', margin: 0 }}>
                मेरा सेवा प्रभाव (My Seva Impact)
              </h2>
              <p className="page-subtitle" style={{ color: 'rgba(255,255,255,0.85)', margin: '2px 0 0' }}>
                Pure Seva Model — Community Recognition
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: 'var(--space-5)' }}>
        {/* Main Hero Card — Total Seva Given */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-6)',
            color: 'white',
            marginBottom: 'var(--space-5)',
            textAlign: 'center',
            boxShadow: '0 8px 24px rgba(30,58,138,0.25)',
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.18)', padding: '4px 12px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700, marginBottom: 12, letterSpacing: '0.04em' }}>
            <HeartHandshake size={15} /> शुद्ध सेवा रिकॉर्ड (PURE SEVA RECORD)
          </div>

          <div style={{ fontSize: '3.2rem', fontWeight: 900, lineHeight: 1 }}>
            {formatMinutes(metrics.totalSevaMinutes)}
          </div>
          <div style={{ opacity: 0.9, fontSize: '1.05rem', fontWeight: 700, marginTop: 'var(--space-2)' }}>
            कुल सेवा योगदान (Total Seva Given)
          </div>

          <div
            style={{
              marginTop: 'var(--space-5)',
              paddingTop: 'var(--space-4)',
              borderTop: '1px solid rgba(255,255,255,0.2)',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.35rem' }}>{metrics.peopleHelped}</div>
              <div style={{ opacity: 0.8, fontSize: '0.75rem', marginTop: 2 }}>People Helped</div>
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: '1.35rem' }}>{metrics.tasksCompleted}</div>
              <div style={{ opacity: 0.8, fontSize: '0.75rem', marginTop: 2 }}>Tasks Done</div>
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: '1.35rem' }}>
                {metrics.avgRating ? `${metrics.avgRating} ★` : '—'}
              </div>
              <div style={{ opacity: 0.8, fontSize: '0.75rem', marginTop: 2 }}>Avg Rating</div>
            </div>
          </div>
        </div>

        {/* This Month Highlight */}
        <div className="card" style={{ marginBottom: 'var(--space-4)', background: '#F8FAFC', border: '1.5px solid #E2E8F0', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Calendar size={22} color="var(--color-primary)" />
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>इस महीने का सेवा योगदान (This Month):</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  {formatMinutes(metrics.thisMonthMinutes)} · {metrics.thisMonthTasks} सेवाएँ पूर्ण
                </div>
              </div>
            </div>
            <span className="badge badge-normal" style={{ fontWeight: 700 }}>Active</span>
          </div>
        </div>

        {/* What You Helped With (Category Breakdown) */}
        {Object.keys(serviceBreakdown).length > 0 && (
          <div className="card" style={{ marginBottom: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
            <h4 style={{ marginBottom: 'var(--space-4)', fontWeight: 800 }}>सेवा का प्रकार (What You Helped With)</h4>
            {Object.entries(serviceBreakdown).map(([service, mins]) => (
              <div key={service} style={{ marginBottom: 'var(--space-3)' }}>
                <div className="flex justify-between" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700 }}>
                  <span style={{ textTransform: 'capitalize' }}>{service}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>{formatMinutes(mins)}</span>
                </div>
                <MiniBar value={mins} max={maxService} color={serviceColors[service] || '#2563EB'} />
              </div>
            ))}
          </div>
        )}

        {/* Milestones & Badges */}
        <div className="card" style={{ marginBottom: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
          <h4 style={{ marginBottom: 'var(--space-4)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Award size={18} color="#F59E0B" /> मील के पत्थर (Milestones)
          </h4>
          {[
            { label: 'पहला सेवा कार्य (First Task Completed)', unlocked: metrics.tasksCompleted >= 1 },
            { label: '5 सेवा कार्य पूर्ण (5 Tasks Completed)', unlocked: metrics.tasksCompleted >= 5 },
            { label: '10 नागरिकों की सहायता (10 People Helped)', unlocked: metrics.peopleHelped >= 10 },
            { label: '10+ घंटे सेवा योगदान (10+ Hours Seva Given)', unlocked: metrics.totalSevaMinutes >= 600 },
            { label: '25 सेवा कार्य पूर्ण (25 Tasks Completed)', unlocked: metrics.tasksCompleted >= 25 },
          ].map(({ label, unlocked }) => (
            <div
              key={label}
              className="flex items-center gap-3"
              style={{
                padding: 'var(--space-3) 0',
                borderBottom: '1px solid var(--color-border)',
                opacity: unlocked ? 1 : 0.45,
              }}
            >
              <span style={{ fontSize: '1.4rem' }}>{unlocked ? '🏅' : '🔒'}</span>
              <span style={{ fontWeight: unlocked ? 700 : 500, fontSize: 'var(--font-size-sm)', color: unlocked ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                {label}
              </span>
              {unlocked && (
                <span className="badge badge-status-completed" style={{ marginLeft: 'auto', fontWeight: 800 }}>
                  ✓ Unlocked
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Reviews Section */}
        {ratings.length > 0 && (
          <div className="card" style={{ borderRadius: 'var(--radius-lg)' }}>
            <h4 style={{ marginBottom: 'var(--space-4)', fontWeight: 800 }}>वरिष्ठ नागरिकों की समीक्षाएँ (Reviews)</h4>
            {ratings.slice(0, 3).map((r) => (
              <div key={r.id} style={{ marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="avatar avatar-sm" style={{ background: '#2563EB', color: 'white', fontWeight: 700 }}>
                    {r.reviewerName?.[0] || 'S'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>{r.reviewerName}</div>
                    <StarRating value={r.stars} readonly size="sm" />
                  </div>
                </div>
                {r.review && (
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontStyle: 'italic', margin: '4px 0 0', lineHeight: 1.4 }}>
                    "{r.review}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
