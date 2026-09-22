import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatMinutes, REQUEST_STATUS } from '../../constants';
import { SOSButton } from '../../components/common/SOSButton';
import SeniorQRModal from '../../components/common/SeniorQRModal';
import { Globe, Pill, ShoppingCart, Landmark, Users } from 'lucide-react';

export default function SeniorHome() {
  const { currentUser, getUserRequests, seniorMode } = useApp();
  const { t, setLangModalOpen } = useLanguage();
  const navigate = useNavigate();
  const [showQR, setShowQR] = useState(false);
  const myRequests = getUserRequests();
  const activeRequests = myRequests.filter(
    (r) => r.status === REQUEST_STATUS.IN_PROGRESS || r.status === REQUEST_STATUS.ACCEPTED
  );
  return (
    <div className={`page-content${seniorMode ? ' senior-mode' : ''}`}>
      <div className="hero-banner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <p style={{ fontSize: 'var(--font-size-sm)', opacity: 0.9, margin: 0 }}>
                {t('goodMorning', 'Good morning')},
              </p>
              <button
                onClick={() => setLangModalOpen(true)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  padding: '2px 8px',
                  color: 'white',
                  fontSize: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <Globe size={11} />
                <span>🌐 {t('language', 'Language')}</span>
              </button>
            </div>
            <h2 style={{ color: 'white', fontWeight: 800, marginBottom: 'var(--space-3)' }}>
              {currentUser?.name?.split(' ')[0]}
            </h2>

            {/* Pure Seva Stats (No spendable currency) */}
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>
                  {myRequests.filter((r) => ['completed', 'rated', 'closed'].includes(r.status)).length}
                </div>
                <div style={{ fontSize: '10px', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Sevas Received
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>
                  {activeRequests.length}
                </div>
                <div style={{ fontSize: '10px', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  In Progress
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>
                  {currentUser?.pincode || '—'}
                </div>
                <div style={{ fontSize: '10px', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Pincode
                </div>
              </div>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0 }}>
            {currentUser?.name?.[0] || '🧓'}
          </div>
        </div>
      </div>

      {/* KYC Warning notice if pending */}
      {currentUser?.kyc_status === 'pending' && (
        <div style={{ margin: 'var(--space-3) var(--space-5) 0', background: '#FEF9E7', border: '1px solid #F39C12', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 'var(--font-size-xs)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.2rem' }}>⏳</span>
          <div>
            <strong>KYC Under Review:</strong> Your ID documents are being verified by your local Pincode Admin. You can still post requests.
          </div>
        </div>
      )}

      {/* Active Request Banner */}
      {activeRequests.length > 0 && (
        <div style={{ margin: 'var(--space-4) var(--space-5) 0', background: '#FEF5E7', border: '1.5px solid #F39C12', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontWeight: 800, fontSize: 'var(--font-size-base)', color: '#B7950B' }}>
              ⚡ {t('activeRequest', 'Active Request in Progress')}
            </div>
            <span className="badge badge-warning" style={{ textTransform: 'uppercase', fontSize: 10 }}>
              {activeRequests[0].status.replace('_', ' ')}
            </span>
          </div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
            <strong>{activeRequests[0].assignedVolunteerName || 'A volunteer'}</strong> is assisting you with your <strong>{activeRequests[0].serviceType}</strong> request.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-accent btn-sm" onClick={() => setShowQR(true)} style={{ minHeight: 44 }}>
              🔑 {t('showPinQr', 'Show My 4-Digit PIN / QR')}
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => navigate('/senior/my-requests')}
              style={{ minHeight: 44, background: 'white' }}
            >
              📋 View Request Details
            </button>
          </div>
        </div>
      )}

      {/* Voice Request Button — High-Contrast Accessible (>60dp) */}
      <div style={{ padding: 'var(--space-4) var(--space-5) var(--space-2)' }}>
        <button
          className="btn btn-primary btn-full"
          onClick={() => navigate('/senior/request?voice=true')}
          style={{
            minHeight: 70,
            fontSize: 'var(--font-size-base)',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            background: 'linear-gradient(135deg, #C0392B 0%, #E74C3C 100%)',
            border: '2px solid #922B21',
            borderRadius: 'var(--radius-xl)',
            boxShadow: '0 4px 16px rgba(192, 57, 43, 0.35)',
            color: 'white',
          }}
          aria-label="बोलकर मदद माँगें - Speak your request"
        >
          <span style={{ fontSize: '2.2rem' }}>🎙️</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.2 }}>बोलकर मदद माँगें</div>
            <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, opacity: 0.9 }}>Speak Request with Voice Note</div>
          </div>
        </button>
      </div>

      {/* Service Request Section Title */}
      <div style={{ padding: 'var(--space-3) var(--space-5) var(--space-2)' }}>
        <h3 style={{ marginBottom: 4, fontSize: 'var(--font-size-lg)' }}>
          {t('iNeedHelpWith', 'मुझे किस सेवा की आवश्यकता है?')}
        </h3>
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', margin: 0 }}>
          {t('tapButtonHelp', 'Tap any category below to request trusted volunteer care.')}
        </p>
      </div>

      {/* Accessible Bilingual Service Buttons (56dp+ touch target, icon + Hindi + English) */}
      <div style={{ padding: '0 var(--space-5) var(--space-4)', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {[
          { type: 'medicine', icon: '💊', hi: 'दवा लाएं', en: 'Medicine Pickup', bg: '#EBF5FB', border: '#AED6F1' },
          { type: 'groceries', icon: '🛒', hi: 'राशन / सामान', en: 'Grocery Shopping', bg: '#FEF9E7', border: '#FAD7A0' },
          { type: 'bank', icon: '🏦', hi: 'बैंक / कागजात', en: 'Bank & Paperwork', bg: '#EAFAF1', border: '#A9DFBF' },
          { type: 'walk', icon: '🚶', hi: 'साथ टहलें', en: 'Walk & Company', bg: '#F5EEF8', border: '#D7BDE2' },
        ].map(({ type, icon, hi, en, bg, border }) => (
          <button
            key={type}
            onClick={() => navigate(`/senior/request?type=${type}`)}
            style={{
              minHeight: 84,
              background: bg,
              border: `2px solid ${border}`,
              borderRadius: 'var(--radius-lg)',
              padding: '12px 10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'transform 0.15s ease',
              gap: 4,
            }}
            aria-label={`${hi} - ${en}`}
          >
            <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>{icon}</span>
            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              {hi}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              {en}
            </div>
          </button>
        ))}
      </div>

      {/* Quick Access to Internal Screens: Trusted Circle + Nearby Map */}
      <div style={{ padding: '0 var(--space-5) var(--space-4)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {/* Trusted Circle Card */}
          <div
            onClick={() => navigate('/senior/trusted-circle')}
            style={{
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: 'var(--shadow-sm)',
              minHeight: 64,
            }}
          >
            <div style={{ fontSize: '1.6rem', background: '#FDEDEC', padding: 8, borderRadius: 10, lineHeight: 1 }}>
              👥
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 'var(--font-size-xs)' }}>विश्वस्त साथी</div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Trusted Circle (10 max)</div>
            </div>
          </div>

          {/* Nearby Map / Community Help Card */}
          <div
            onClick={() => navigate('/senior/nearby')}
            style={{
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: 'var(--shadow-sm)',
              minHeight: 64,
            }}
          >
            <div style={{ fontSize: '1.6rem', background: '#E8F8F5', padding: 8, borderRadius: 10, lineHeight: 1 }}>
              📍
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 'var(--font-size-xs)' }}>आसपास का नक्शा</div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Nearby Feed & Map</div>
            </div>
          </div>
        </div>
      </div>

      {/* My Recent Requests */}
      <div style={{ padding: '0 var(--space-5) var(--space-6)' }}>
        <div className="flex justify-between items-center mb-3">
          <h3 style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>{t('myRequests', 'मेरी पिछली सेवाएं / My Requests')}</h3>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/senior/my-requests')}
            style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}
          >
            {t('viewAll', 'सभी देखें / View all →')}
          </button>
        </div>

        {myRequests.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 16px', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-lg)' }}>
            <div className="empty-state-icon">🤝</div>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>अभी तक कोई अनुरोध नहीं किया गया है।</p>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              ऊपर दिए गए किसी भी बटन को दबाकर सेवा प्राप्त करें।
            </p>
          </div>
        ) : (
          myRequests.slice(0, 3).map((req) => (
            <div
              key={req.id}
              className="card"
              onClick={() => navigate('/senior/my-requests')}
              style={{
                marginBottom: 'var(--space-3)',
                borderLeft: req.status === 'in_progress' ? '4px solid var(--color-warning)' : '4px solid var(--color-primary)',
                cursor: 'pointer',
                padding: '12px 14px',
              }}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: '1.6rem' }}>
                    {req.serviceType === 'medicine' ? '💊' : req.serviceType === 'groceries' ? '🛒' : req.serviceType === 'bank' ? '🏦' : '🤝'}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>
                      {req.serviceType.charAt(0).toUpperCase() + req.serviceType.slice(1)}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span className={`badge badge-status-${req.status.replace('_', '-')}`} style={{ fontSize: 11, textTransform: 'capitalize' }}>
                    {req.status.replace('_', ' ')}
                  </span>
                  {req.lifecycleStatus === 'notified_trusted' && (
                    <span style={{ fontSize: '10px', color: '#B7950B', fontWeight: 600 }}>Sent to Circle first</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <SOSButton />
      <SeniorQRModal isOpen={showQR} onClose={() => setShowQR(false)} />
    </div>
  );
}

