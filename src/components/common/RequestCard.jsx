import { SERVICE_ICONS, SERVICE_LABELS, URGENCY, REQUEST_STATUS, formatMinutes } from '../../constants';
function statusBadgeClass(status) {
  const map = {
    open: 'badge-status-open',
    accepted: 'badge-status-accepted',
    in_progress: 'badge-status-in-progress',
    completed: 'badge-status-completed',
    cancelled: 'badge-status-cancelled',
  };
  return map[status] || 'badge-status-open';
}
function statusLabel(status) {
  const map = {
    open: 'Open',
    accepted: 'Accepted',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return map[status] || status;
}
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
export default function RequestCard({ request, onAccept, showDistance, distance, compact = false }) {
  const isHighUrgency = request.urgency === URGENCY.HIGH;
  const isOpen = request.status === REQUEST_STATUS.OPEN;
  return (
    <div
      className="card"
      style={{
        marginBottom: 'var(--space-3)',
        borderLeft: isHighUrgency ? '4px solid var(--color-danger)' : '4px solid transparent',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span style={{ fontSize: '1.8rem' }} aria-hidden="true">
            {SERVICE_ICONS[request.serviceType] || ''}
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 'var(--font-size-base)' }}>
              {SERVICE_LABELS[request.serviceType] || request.serviceType}
            </div>
            {showDistance && (
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                {request.pincode} · {distance}
              </div>
            )}
          </div>
        </div>
        <div className="flex" style={{ gap: 'var(--space-2)', flexDirection: 'column', alignItems: 'flex-end' }}>
          {isHighUrgency && (
            <span className="badge badge-high"> Urgent</span>
          )}
          <span className={`badge ${statusBadgeClass(request.status)}`}>{statusLabel(request.status)}</span>
        </div>
      </div>
      {!compact && (
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
          {request.description}
        </p>
      )}
      <div className="flex items-center justify-between">
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
          <span>By {request.seniorName}</span>
          <span style={{ margin: '0 6px' }}>·</span>
          <span>{timeAgo(request.createdAt)}</span>
          {request.estimatedDuration && (
            <>
              <span style={{ margin: '0 6px' }}>·</span>
              <span>~{formatMinutes(request.estimatedDuration)}</span>
            </>
          )}
        </div>
        {onAccept && isOpen && (
          <button className="btn btn-primary btn-sm" onClick={() => onAccept(request)}>
            Accept
          </button>
        )}
      </div>
      {request.assignedVolunteerName && (
        <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)' }}>
          Assigned to <strong>{request.assignedVolunteerName}</strong>
        </div>
      )}
      {request.rating && (
        <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--color-success-bg)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)' }}>
          {request.rating.stars}/5 - {request.rating.review}
        </div>
      )}
    </div>
  );
}
