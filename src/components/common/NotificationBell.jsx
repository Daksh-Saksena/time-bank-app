import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import Modal from './Modal';

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
  const { notifications, unreadCount, markNotificationsAsRead, fetchUserNotifications, currentUser } = useApp();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (currentUser?.id) {
      fetchUserNotifications(currentUser.id);
    }
  }, [currentUser?.id]);

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
          width: 40, height: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          color: 'white',
          flexShrink: 0,
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            background: '#E74C3C', color: 'white',
            borderRadius: '50%', width: 18, height: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700,
            border: '2px solid var(--color-primary)',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Notifications">
        <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔔</div>
              <p>No notifications yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: 'var(--space-4) var(--space-2)',
                    borderBottom: '1px solid var(--color-border)',
                    background: n.read ? 'transparent' : 'var(--color-surface-alt)',
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                  }}
                >
                  <span style={{ fontSize: '1.4rem', flexShrink: 0, marginTop: 2 }}>{TYPE_ICONS[n.type] || '📢'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: n.read ? 500 : 700, fontSize: 'var(--font-size-sm)', marginBottom: 2 }}>{n.title}</div>
                    {n.body && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{n.body}</div>}
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>{formatTime(n.created_at)}</div>
                  </div>
                  {!n.read && (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', flexShrink: 0, marginTop: 6 }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
