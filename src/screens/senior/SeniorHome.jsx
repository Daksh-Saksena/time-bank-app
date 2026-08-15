import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatMinutes, REQUEST_STATUS } from '../../data/mockData';
import { SOSButton } from '../../components/common/SOSButton';
import SeniorQRModal from '../../components/common/SeniorQRModal';
export default function SeniorHome() {
  const { currentUser, getUserRequests, seniorMode } = useApp();
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
            <p style={{ fontSize: 'var(--font-size-sm)', opacity: 0.8, marginBottom: 4 }}>Good morning,</p>
            <h2 style={{ color: 'white', fontWeight: 800, marginBottom: 'var(--space-4)' }}>
              {currentUser?.name?.split(' ')[0]}
            </h2>
            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <div>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'white' }}>
                  {formatMinutes(currentUser?.timeBalance || 0)}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8 }}>Time Balance</div>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.3)' }} />
              <div>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'white' }}>
                  400001
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8 }}>Your Pincode</div>
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
          <div style={{ fontWeight: 700, marginBottom: 4 }}> Active Request</div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
            {activeRequests[0].assignedVolunteerName} is on their way for your {activeRequests[0].serviceType} request.
          </div>
          <button className="btn btn-accent btn-sm" onClick={() => setShowQR(true)}>
            Show My PIN / QR Code
          </button>
        </div>
      )}
      <div style={{ padding: 'var(--space-5) var(--space-5) var(--space-2)' }}>
        <h3 style={{ marginBottom: 'var(--space-2)' }}>I need help with…</h3>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 0 }}>
          Tap a button to request assistance from your community.
        </p>
      </div>
      <div className="service-grid">
        {[
          { type: 'medicine', icon: '', label: 'Medicine' },
          { type: 'groceries', icon: '', label: 'Groceries' },
          { type: 'bank', icon: '', label: 'Bank Visit' },
          { type: 'walk', icon: '', label: 'Walk / Company' },
        ].map(({ type, icon, label }) => (
          <button
            key={type}
            className="service-btn"
            onClick={() => navigate(`/senior/request?type=${type}`)}
            aria-label={`Request ${label} assistance`}
          >
            <span className="service-btn-icon" aria-hidden="true">{icon}</span>
            <span className="service-btn-label">{label}</span>
          </button>
        ))}
      </div>
      <div style={{ padding: '0 var(--space-5) var(--space-4)' }}>
        <button
          className="btn btn-outline btn-full"
          onClick={() => navigate('/senior/request?voice=true')}
          style={{ borderStyle: 'dashed', gap: 'var(--space-3)' }}
        >
          <span style={{ fontSize: '1.4rem' }}></span>
          <span>Describe your need by voice</span>
        </button>
      </div>
      <div style={{ padding: '0 var(--space-5)' }}>
        <div className="flex justify-between items-center mb-4">
          <h3>My Requests</h3>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/senior/nearby')}
            style={{ fontSize: 'var(--font-size-sm)' }}
          >
            View all
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
