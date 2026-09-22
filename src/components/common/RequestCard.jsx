import { useState } from 'react';
import {
  SERVICE_ICONS,
  SERVICE_LABELS,
  URGENCY,
  REQUEST_STATUS,
  formatMinutes,
} from '../../constants';
import { Video, CheckCircle, Clock, ShieldCheck } from 'lucide-react';
import VideoCallModal from './VideoCallModal';
import { useApp } from '../../context/AppContext';

function statusBadgeClass(status) {
  const map = {
    open: 'badge-status-open',
    notified_trusted: 'badge-status-open',
    accepted: 'badge-status-accepted',
    in_progress: 'badge-status-in-progress',
    completed: 'badge-status-completed',
    rated: 'badge-status-completed',
    closed: 'badge-status-cancelled',
    cancelled: 'badge-status-cancelled',
  };
  return map[status] || 'badge-status-open';
}

function statusLabel(status) {
  const map = {
    open: 'Created (खुला)',
    notified_trusted: 'Notified to Trusted (ट्रस्टेड)',
    accepted: 'Accepted (स्वीकृत)',
    in_progress: 'In Progress (जारी)',
    completed: 'Completed (पूर्ण)',
    rated: 'Rated (रेटेड)',
    closed: 'Closed (समाप्त)',
    cancelled: 'Cancelled (रद्द)',
  };
  return map[status] || status;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function RequestCard({ request, onAccept, showDistance, distance, compact = false }) {
  const { closeRequest, currentUser } = useApp();
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const isHighUrgency = request.urgency === URGENCY.HIGH;
  const isOpen = request.status === REQUEST_STATUS.OPEN || request.status === REQUEST_STATUS.NOTIFIED_TRUSTED;
  const isActiveTask = request.status === REQUEST_STATUS.ACCEPTED || request.status === REQUEST_STATUS.IN_PROGRESS;
  const isRated = request.status === REQUEST_STATUS.RATED;
  const isSeniorOwner = currentUser?.id === request.seniorId || currentUser?.id === request.senior_id;

  return (
    <div
      className="card"
      style={{
        marginBottom: 'var(--space-3)',
        borderLeft: isHighUrgency ? '4px solid var(--color-danger)' : '4px solid var(--color-primary-light, #E2E8F0)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span style={{ fontSize: '1.8rem' }} aria-hidden="true">
            {SERVICE_ICONS[request.serviceType] || '🤝'}
          </span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)' }}>
              {SERVICE_LABELS[request.serviceType] || request.serviceType}
            </div>
            {showDistance && (
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                {request.pincode} · {distance}
              </div>
            )}
          </div>
        </div>
        <div className="flex" style={{ gap: 6, flexDirection: 'column', alignItems: 'flex-end' }}>
          {isHighUrgency ? (
            <span className="badge badge-high" style={{ fontSize: '0.75rem', fontWeight: 800 }}>
              High Priority (तत्काल)
            </span>
          ) : (
            <span className="badge badge-normal" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
              Normal Priority (सामान्य)
            </span>
          )}
          <span className={`badge ${statusBadgeClass(request.status)}`} style={{ fontWeight: 800, fontSize: '0.78rem' }}>
            {statusLabel(request.status)}
          </span>
        </div>
      </div>

      {!compact && (
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: (request.audioUrl || request.audio_url) ? 'var(--space-2)' : 0 }}>
            {request.description}
          </p>
          {(request.audioUrl || request.audio_url) && (
            <div style={{ marginTop: 'var(--space-2)', background: 'var(--color-surface-alt)', padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <audio src={request.audioUrl || request.audio_url} controls style={{ width: '100%', height: 32 }} />
            </div>
          )}
        </div>
      )}

      {/* Schedule, Duration & Senior Meta */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 10, padding: '6px 10px', background: '#F8FAFC', borderRadius: 'var(--radius-md)' }}>
        <span>वरिष्ठ: <strong>{request.seniorName}</strong></span>
        <span>स्थान: <strong>{request.location || 'Local Area'}</strong> {request.pincode ? `(${request.pincode})` : ''}</span>
        <span>दिनांक: <strong>{request.scheduledDate || timeAgo(request.createdAt || request.created_at)}</strong></span>
        {request.scheduledTime && <span>समय: {request.scheduledTime}</span>}
        <span>अनुमानित: <strong>~{request.estimatedDuration || 30} मिनट</strong></span>
      </div>

      {(request.createdByAdminName || request.created_by_admin_name) && (
        <div style={{ marginBottom: 10, fontSize: '0.76rem', color: '#1E40AF', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '4px 10px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
          <ShieldCheck size={14} color="#2563EB" />
          <span>Created by Admin <strong>{request.createdByAdminName || request.created_by_admin_name}</strong> on behalf of {request.seniorName}</span>
        </div>
      )}

      <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
          <span>दर्ज: {timeAgo(request.createdAt || request.created_at)}</span>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Video Assistance button for Active Tasks */}
          {isActiveTask && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderColor: '#2563EB',
                color: '#2563EB',
                fontWeight: 700,
                minHeight: 38,
                padding: '4px 12px',
                borderRadius: 'var(--radius-md)',
              }}
              onClick={() => setVideoModalOpen(true)}
            >
              <Video size={16} />
              <span>Video Assistance</span>
            </button>
          )}

          {/* Accept button for volunteers */}
          {onAccept && isOpen && (
            <button
              className="btn btn-primary btn-sm"
              style={{ minHeight: 38, fontWeight: 700, padding: '4px 14px', borderRadius: 'var(--radius-md)' }}
              onClick={() => onAccept(request)}
            >
              स्वीकार करें (Accept)
            </button>
          )}

          {/* Close button for rated requests */}
          {isRated && isSeniorOwner && closeRequest && (
            <button
              className="btn btn-ghost btn-sm"
              style={{
                minHeight: 36,
                fontWeight: 700,
                color: 'var(--color-text-muted)',
                fontSize: '0.8rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}
              onClick={() => closeRequest(request.id)}
            >
              ✓ बंद करें (Close)
            </button>
          )}
        </div>
      </div>

      {request.assignedVolunteerName && (
        <div style={{ marginTop: 'var(--space-3)', padding: '8px 12px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
          <CheckCircle size={16} color="#16A34A" />
          <span>सहायक: <strong>{request.assignedVolunteerName}</strong></span>
        </div>
      )}

      {request.rating && (
        <div style={{ marginTop: 'var(--space-3)', padding: '8px 12px', background: 'var(--color-success-bg)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }}>
          Rating: {request.rating.stars}/5: {request.rating.review || 'सेवा की सराहना की गई'}
        </div>
      )}

      {/* Video Call Modal */}
      <VideoCallModal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        requestId={request.id}
        title={`Video Assistance: ${request.seniorName}`}
      />
    </div>
  );
}
