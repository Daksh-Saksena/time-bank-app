import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatMinutes, SERVICE_ICONS, SERVICE_LABELS, isDND, VOLUNTEER_STATUS, URGENCY } from '../../constants';
import { HeartHandshake, CheckCircle2, Users, Star, Moon, Clock, Calendar, AlertCircle } from 'lucide-react';

export default function VolunteerHome() {
  const {
    currentUser,
    getOpenRequests,
    getVolunteerActiveRequest,
    getVolunteerMetrics,
    fetchRequests,
    updateVolunteerStatus,
  } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const openRequests = getOpenRequests();
  const activeRequest = getVolunteerActiveRequest();
  const currentStatus = currentUser?.volunteer_status || VOLUNTEER_STATUS.AVAILABLE;
  const metrics = getVolunteerMetrics();
  const isNightDND = isDND();

  return (
    <div className="page-content" style={{ paddingBottom: 80 }}>
      {/* Hero Banner: Pure Seva Model (No spendable currency) */}
      <div className="hero-banner" style={{ background: 'linear-gradient(135deg, #1B4F72 0%, #2E86AB 100%)' }}>
        <div className="flex justify-between items-center">
          <div>
            <p style={{ fontSize: 'var(--font-size-sm)', opacity: 0.85, marginBottom: 4 }}>
              सेवा कार्य में स्वागत है,
            </p>
            <h2 style={{ color: 'white', fontWeight: 800, marginBottom: 'var(--space-3)', fontSize: '1.6rem' }}>
              {currentUser?.name || 'Sevak'}
            </h2>
            <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 'var(--radius-lg)', padding: '10px 14px', display: 'inline-block' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                कुल सेवा योगदान (Total Seva Given)
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', marginTop: 2 }}>
                {formatMinutes(metrics.totalSevaMinutes)}
              </div>
            </div>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '50%',
              width: 64,
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              fontWeight: 800,
              color: 'white',
              flexShrink: 0,
              boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
            }}
          >
            {currentUser?.name?.[0] || 'V'}
          </div>
        </div>
      </div>

      {/* Night-time DND Banner (10 PM to 6 AM) */}
      {isNightDND && (
        <div
          style={{
            margin: 'var(--space-3) var(--space-5) 0',
            background: '#F3E8FF',
            border: '1.5px solid #D8B4FE',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#6B21A8',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 600,
          }}
        >
          <Moon size={18} color="#7E22CE" />
          <span>
            <strong>रात्रि विश्राम मोड (Night DND Active 10 PM to 6 AM):</strong> रात के समय नए अनुरोधों की सूचनाएं मौन रहती हैं ताकि आपकी नींद बाधित न हो।
          </span>
        </div>
      )}

      {/* Quick Status Bar (Ready / Busy / DND) */}
      <div style={{ padding: 'var(--space-3) var(--space-5) 0' }}>
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 14px',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div>
            <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
              आपकी उपलब्धता (Availability):
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
              {currentStatus === VOLUNTEER_STATUS.AVAILABLE
                ? 'आप नए अनुरोध स्वीकार कर सकते हैं'
                : currentStatus === VOLUNTEER_STATUS.BUSY
                ? 'आप अभी व्यस्त हैं'
                : 'DND: सूचनाएं बंद हैं'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { id: VOLUNTEER_STATUS.AVAILABLE, label: 'Ready', color: '#16A34A', bg: '#DCFCE7' },
              { id: VOLUNTEER_STATUS.BUSY, label: 'Busy', color: '#D97706', bg: '#FEF3C7' },
              { id: VOLUNTEER_STATUS.DND, label: 'DND', color: '#DC2626', bg: '#FEE2E2' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => updateVolunteerStatus(s.id)}
                style={{
                  border: currentStatus === s.id ? `2px solid ${s.color}` : '1px solid var(--color-border)',
                  background: currentStatus === s.id ? s.bg : 'white',
                  color: currentStatus === s.id ? s.color : 'var(--color-text-muted)',
                  fontWeight: currentStatus === s.id ? 800 : 600,
                  fontSize: 'var(--font-size-xs)',
                  padding: '6px 12px',
                  borderRadius: 20,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  minHeight: 36,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Task Banner if in progress */}
      {activeRequest && (
        <div style={{ margin: 'var(--space-4) var(--space-5) 0' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
              border: '2px solid #F59E0B',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-4)',
              boxShadow: '0 4px 12px rgba(245,158,11,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 'var(--font-size-base)', color: '#92400E', display: 'flex', alignItems: 'center', gap: 6 }}>
                सक्रिय सेवा कार्य (Active Task)
              </span>
              <span className="badge badge-status-in-progress" style={{ animation: 'pulse 1.5s infinite' }}>
                ● On the way / In Progress
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {SERVICE_ICONS[activeRequest.serviceType]} {SERVICE_LABELS[activeRequest.serviceType]}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: '#78350F', marginTop: 2 }}>
                  वरिष्ठ नागरिक: <strong>{activeRequest.seniorName}</strong> · स्थान: {activeRequest.location}
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                style={{ minHeight: 40, fontWeight: 700, padding: '6px 16px', borderRadius: 'var(--radius-md)' }}
                onClick={() => navigate('/volunteer/task')}
              >
                कार्य देखें →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coherent Statistics Grid (Single source of truth) */}
      <div style={{ padding: 'var(--space-4) var(--space-5) 0' }}>
        <div className="stat-grid">
          <div className="stat-card" style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: '14px', border: '1px solid var(--color-border)' }}>
            <div className="stat-value" style={{ color: '#1B4F72', fontSize: '1.5rem', fontWeight: 800 }}>
              {metrics.tasksCompleted}
            </div>
            <div className="stat-label" style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <CheckCircle2 size={14} color="#16A34A" /> Tasks Done
            </div>
          </div>

          <div className="stat-card" style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: '14px', border: '1px solid var(--color-border)' }}>
            <div className="stat-value" style={{ color: '#1B4F72', fontSize: '1.5rem', fontWeight: 800 }}>
              {formatMinutes(metrics.totalSevaMinutes)}
            </div>
            <div className="stat-label" style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <HeartHandshake size={14} color="#2563EB" /> Total Seva
            </div>
          </div>

          <div className="stat-card" style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: '14px', border: '1px solid var(--color-border)' }}>
            <div className="stat-value" style={{ color: '#1B4F72', fontSize: '1.5rem', fontWeight: 800 }}>
              {metrics.peopleHelped}
            </div>
            <div className="stat-label" style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Users size={14} color="#D97706" /> People Helped
            </div>
          </div>

          <div className="stat-card" style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: '14px', border: '1px solid var(--color-border)' }}>
            <div className="stat-value" style={{ color: '#1B4F72', fontSize: '1.5rem', fontWeight: 800 }}>
              {metrics.avgRating ? `${metrics.avgRating} ★` : 'N/A'}
            </div>
            <div className="stat-label" style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Star size={14} color="#F59E0B" /> {metrics.reviewCount > 0 ? `${metrics.reviewCount} Reviews` : 'New Sevak'}
            </div>
          </div>
        </div>
      </div>

      {/* Open Requests Nearby Section */}
      <div style={{ padding: 'var(--space-5) var(--space-5) 0' }}>
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
              आस-पास के खुले अनुरोध (Nearby Requests)
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
              {currentUser?.pincode ? `पिनकोड ${currentUser.pincode}` : 'स्थानीय क्षेत्र'}
            </p>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ fontWeight: 700, color: 'var(--color-primary)' }}
            onClick={() => navigate('/volunteer/nearby')}
          >
            सभी देखें ({openRequests.length}) ›
          </button>
        </div>

        {openRequests.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-6)', background: '#F8FAFC', borderRadius: 'var(--radius-lg)' }}>
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text-muted)' }}>
              आपके क्षेत्र में अभी कोई नया अनुरोध नहीं है। जैसे ही कोई वरिष्ठ नागरिक मदद मांगेगा, यहाँ दिखेगा।
            </p>
          </div>
        ) : (
          openRequests.slice(0, 3).map((req) => {
            const isHighUrgency = req.urgency === URGENCY.HIGH;
            return (
              <div
                key={req.id}
                className="card"
                style={{
                  marginBottom: 'var(--space-3)',
                  borderLeft: isHighUrgency ? '4px solid #DC2626' : '4px solid #2563EB',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-lg)',
                  padding: '14px 16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
                onClick={() => navigate('/volunteer/nearby')}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: '1.8rem' }}>{SERVICE_ICONS[req.serviceType] || '🤝'}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--color-text-primary)' }}>
                        {SERVICE_LABELS[req.serviceType] || req.serviceType}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        द्वारा: <strong>{req.seniorName}</strong> · {req.location || 'Local Area'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    {isHighUrgency ? (
                      <span className="badge badge-high" style={{ fontSize: '0.75rem' }}>Urgent</span>
                    ) : (
                      <span className="badge badge-normal" style={{ fontSize: '0.75rem' }}>Normal</span>
                    )}
                    <span className="badge badge-status-open" style={{ fontSize: '0.7rem' }}>
                      {req.status === 'notified_trusted' ? 'Trusted Priority' : 'Open'}
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0 0 10px', lineHeight: 1.4 }}>
                  "{req.description}"
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--color-text-muted)', borderTop: '1px solid #F1F5F9', paddingTop: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={13} /> {req.scheduledDate || 'आज'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={13} /> ~{req.estimatedDuration || 30} min
                  </span>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                    विवरण देखें →
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
