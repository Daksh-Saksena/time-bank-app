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
            <h2 style={{ color: 'white', fontWeight: 800, marginBottom: 'var(--space-4)' }}>
              {currentUser?.name?.split(' ')[0]}
            </h2>
            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <div>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'white' }}>
                  {formatMinutes(currentUser?.time_balance ?? currentUser?.timeBalance ?? 0)}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8 }}>
                  {t('timeBalance', 'Time Balance')}
                </div>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.3)' }} />
              <div>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'white' }}>
                  {currentUser?.pincode || '—'}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8 }}>
                  {t('yourPincode', 'Your Pincode')}
                </div>
              </div>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0 }}>
            {currentUser?.name?.[0] || '?'}
          </div>
        </div>
      </div>
      {activeRequests.length > 0 && (
        <div style={{ margin: 'var(--space-4) var(--space-5) 0', background: '#FEF5E7', border: '1px solid #FAD7A0', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}> {t('activeRequest', 'Active Request')}</div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
            {activeRequests[0].assignedVolunteerName} is on their way for your {activeRequests[0].serviceType} request.
          </div>
          <button className="btn btn-accent btn-sm" onClick={() => setShowQR(true)}>
            {t('showPinQr', 'Show My PIN / QR Code')}
          </button>
        </div>
      )}
      <div style={{ padding: 'var(--space-5) var(--space-5) var(--space-2)' }}>
        <h3 style={{ marginBottom: 'var(--space-2)' }}>{t('iNeedHelpWith', 'I need help with…')}</h3>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 0 }}>
          {t('tapButtonHelp', 'Tap a button to request assistance from your community.')}
        </p>
      </div>
      <div className="service-grid">
        {[
          { type: 'medicine', labelKey: 'medicine', defaultLabel: 'Medicine' },
          { type: 'groceries', labelKey: 'groceries', defaultLabel: 'Groceries' },
          { type: 'bank', labelKey: 'bank', defaultLabel: 'Bank Visit' },
          { type: 'walk', labelKey: 'walk', defaultLabel: 'Walk / Company' },
        ].map(({ type, labelKey, defaultLabel }) => (
          <button
            key={type}
            className="service-btn"
            onClick={() => navigate(`/senior/request?type=${type}`)}
            aria-label={`Request ${t(labelKey, defaultLabel)} assistance`}
          >
            <span className="service-btn-label" style={{ fontWeight: 700 }}>
              {t(labelKey, defaultLabel)}
            </span>
          </button>
        ))}
      </div>
      <div style={{ padding: '0 var(--space-5) var(--space-4)' }}>
        <button
          className="btn btn-outline btn-full"
          onClick={() => navigate('/senior/request?voice=true')}
          style={{ borderStyle: 'dashed', gap: 'var(--space-3)' }}
        >
          <span>{t('describeByVoice', 'Describe your need by voice')}</span>
        </button>
      </div>
      <div style={{ padding: '0 var(--space-5)' }}>
        <div className="flex justify-between items-center mb-4">
          <h3>{t('myRequests', 'My Requests')}</h3>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/senior/nearby')}
            style={{ fontSize: 'var(--font-size-sm)' }}
          >
            {t('viewAll', 'View all')}
          </button>
        </div>
        {myRequests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"></div>
            <p>You haven't made any requests yet.</p>
            <p style={{ fontSize: 'var(--font-size-sm)' }}>Tap one of the buttons above to get started.</p>
          </div>
        ) : (
          myRequests.slice(0, 3).map((req) => (
            <div
              key={req.id}
              className="card"
              style={{ marginBottom: 'var(--space-3)', borderLeft: req.urgency === 'high' ? '4px solid var(--color-danger)' : '4px solid transparent' }}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: '1.6rem' }}>
                    {req.serviceType === 'medicine' ? '' : req.serviceType === 'groceries' ? '' : req.serviceType === 'bank' ? '' : ''}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600 }}>{req.serviceType.charAt(0).toUpperCase() + req.serviceType.slice(1)}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                </div>
                <span className={`badge badge-status-${req.status.replace('_', '-')}`}>
                  {req.status.replace('_', ' ')}
                </span>
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
