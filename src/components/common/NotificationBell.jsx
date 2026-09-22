import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, X, ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import Modal from './Modal';
import { canPerformSevaAction } from '../../constants';

const TYPE_ICONS = {
  new_request: '🆕',
  request_accepted: '✅',
  volunteer_on_way: '🏃',
  request_completed: '🎉',
  rating_required: '⭐',
  kyc_approved: '🛡️',
  admin_approval: '👑',
  low_rating_alert: '⚠️',
};

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markNotificationsAsRead,
    fetchUserNotifications,
    currentUser,
    acceptRequest,
  } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (currentUser?.id) {
      fetchUserNotifications(currentUser.id);
    }
  }, [currentUser?.id, fetchUserNotifications]);

  function handleOpen() {
    setOpen(true);
    if (unreadCount > 0) {
      markNotificationsAsRead();
    }
  }

  function formatTime(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  async function handleAcceptNotification(n) {
    if (!canPerformSevaAction(currentUser, 'accept_task')) {
      alert('Identity Verification Pending: Your KYC is currently under review by your Pincode Admin.');
      return;
    }
    if (!n.requestId) return;

    setProcessingId(n.id);
    try {
      await acceptRequest(n.requestId);
      setOpen(false);
      navigate('/volunteer/task');
    } catch (err) {
      console.error('Error accepting from notification:', err);
    } finally {
      setProcessingId(null);
    }
  }

  function handleDeclineNotification(n) {
    // Dismiss/mark notification handled
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={handleOpen}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        style={{
          position: 'relative',
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          borderRadius: '50%',
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'white',
          flexShrink: 0,
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              background: '#EF4444',
              color: 'white',
              borderRadius: '50%',
              width: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 800,
              border: '2px solid var(--color-primary)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="सूचनाएं (Notifications)">
        <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔔</div>
              <p style={{ margin: 0, fontWeight: 600 }}>कोई नई सूचना नहीं है (No notifications yet)</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {notifications.map((n) => {
                const isNewRequest = n.type === 'new_request';
                return (
                  <div
                    key={n.id}
                    style={{
                      padding: '14px 12px',
                      borderBottom: '1px solid var(--color-border)',
                      background: n.read ? 'transparent' : '#F0F9FF',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                    }}
                  >
                    <span style={{ fontSize: '1.4rem', flexShrink: 0, marginTop: 2 }}>
                      {TYPE_ICONS[n.type] || '📢'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: n.read ? 600 : 800, fontSize: 'var(--font-size-sm)', marginBottom: 2, color: 'var(--color-text-primary)' }}>
                        {n.title}
                      </div>
                      {n.body && (
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                          {n.body}
                        </div>
                      )}
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                        {formatTime(n.created_at)}
                      </div>

                      {/* Accept / Decline Action Buttons for New Requests */}
                      {isNewRequest && n.requestId && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={processingId === n.id}
                            onClick={() => handleAcceptNotification(n)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 14px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              borderRadius: 'var(--radius-md)',
                            }}
                          >
                            <Check size={14} />
                            <span>{processingId === n.id ? 'स्वीकार हो रहा है…' : 'स्वीकार करें (Accept)'}</span>
                          </button>

                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => handleDeclineNotification(n)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 12px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              borderRadius: 'var(--radius-md)',
                              color: 'var(--color-text-muted)',
                            }}
                          >
                            <X size={14} />
                            <span>अस्वीकार (Decline)</span>
                          </button>
                        </div>
                      )}
                    </div>
                    {!n.read && (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: 'var(--color-primary)',
                          flexShrink: 0,
                          marginTop: 6,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
