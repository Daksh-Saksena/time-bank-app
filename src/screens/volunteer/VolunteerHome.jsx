import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatMinutes, REQUEST_STATUS, SERVICE_ICONS, SERVICE_LABELS } from '../../constants';

export default function VolunteerHome() {
  const { currentUser, getOpenRequests, getVolunteerActiveRequest, acceptRequest, fetchRequests, updateVolunteerStatus } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);
  const openRequests = getOpenRequests();
  const activeRequest = getVolunteerActiveRequest();
  const stats = currentUser?.volunteerStats || {};
  const currentStatus = currentUser?.volunteer_status || 'available';

  return (
    <div className="page-content">
      <div className="hero-banner">
        <div className="flex justify-between items-center">
          <div>
            <p style={{ fontSize: 'var(--font-size-sm)', opacity: 0.8, marginBottom: 4 }}>Welcome back,</p>
            <h2 style={{ color: 'white', fontWeight: 800, marginBottom: 'var(--space-3)' }}>
              {currentUser?.name?.split(' ')[0]}
            </h2>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', display: 'inline-block' }}>
              <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800, color: 'white' }}>{formatMinutes(currentUser?.timeBalance || 0)}</span>
              <span style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8, marginLeft: 8 }}>Time Credits</span>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0 }}>
            {currentUser?.name?.[0] || '?'}
          </div>
        </div>
      </div>

      {/* Quick Status Bar */}
      <div style={{ padding: 'var(--space-3) var(--space-5) 0' }}>
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          padding: '10px 14px',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            Status:
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { id: 'available', label: '🟢 Ready', color: '#27AE60', bg: '#E8F8F0' },
              { id: 'busy', label: '🟡 Busy', color: '#D68910', bg: '#FEF9E7' },
              { id: 'dnd', label: '🔴 DND', color: '#C0392B', bg: '#FDEDEC' },
            ].map(s => (
              <button
                key={s.id}
                onClick={() => updateVolunteerStatus(s.id)}
                style={{
                  border: currentStatus === s.id ? `2px solid ${s.color}` : '1px solid var(--color-border)',
                  background: currentStatus === s.id ? s.bg : 'transparent',
                  color: currentStatus === s.id ? s.color : 'var(--color-text-muted)',
                  fontWeight: currentStatus === s.id ? 700 : 500,
                  fontSize: 'var(--font-size-xs)',
                  padding: '5px 10px',
                  borderRadius: 20,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeRequest ? (
        <div style={{ margin: 'var(--space-4) var(--space-5) 0' }}>
          <div style={{ background: '#FEF5E7', border: '2px solid #F39C12', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
            <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 'var(--font-size-base)' }}> Active Task</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                  {SERVICE_ICONS[activeRequest.serviceType]} {SERVICE_LABELS[activeRequest.serviceType]} for {activeRequest.seniorName}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>In progress</div>
              </div>
              <button className="btn btn-accent btn-sm" onClick={() => navigate('/volunteer/task')}>
                Continue →
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div style={{ padding: 'var(--space-5) var(--space-5) var(--space-2)' }}>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.tasksCompleted || 0}</div>
            <div className="stat-label">Tasks Done</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatMinutes(stats.hoursVolunteered || 0)}</div>
            <div className="stat-label">Time Given</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.peopleHelped || 0}</div>
            <div className="stat-label">People Helped</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{currentUser?.rating?.toFixed(1) || '-'} </div>
            <div className="stat-label">Your Rating</div>
          </div>
        </div>
      </div>
      <div style={{ padding: '0 var(--space-5)' }}>
        <div className="flex justify-between items-center mb-4">
          <h3>Open Requests Nearby</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/volunteer/nearby')}>
            See all ({openRequests.length})
          </button>
        </div>
        {openRequests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"></div>
            <p>No open requests in your area right now.</p>
          </div>
        ) : (
          openRequests.slice(0, 2).map((req) => (
            <div
              key={req.id}
              className="card"
              style={{ marginBottom: 'var(--space-3)', borderLeft: req.urgency === 'high' ? '4px solid var(--color-danger)' : '4px solid transparent', cursor: 'pointer' }}
              onClick={() => navigate('/volunteer/nearby')}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: '1.6rem' }}>{SERVICE_ICONS[req.serviceType]}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{SERVICE_LABELS[req.serviceType]}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>by {req.seniorName}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-1)' }}>
                  {req.urgency === 'high' && <span className="badge badge-high">Urgent</span>}
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}> 0.5 km</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
