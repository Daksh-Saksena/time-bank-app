import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StarRating from '../../components/common/StarRating';
import { formatMinutes, KYC_STATUS } from '../../constants';
import { supabase } from '../../lib/supabase';
import {
  Bell,
  History,
  MessageCircle,
  ShieldCheck,
  Power,
  ChevronRight,
} from 'lucide-react';

export default function VolunteerProfile() {
  const { currentUser, logout, getUserRatings } = useApp();
  const navigate = useNavigate();
  const ratings = getUserRatings();
  const [available, setAvailable] = useState(currentUser?.is_available ?? true);
  const [toastMessage, setToastMessage] = useState('');

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  }

  async function handleToggleAvailability() {
    const next = !available;
    setAvailable(next);
    showToast(next ? 'You are now marked Available for requests' : 'You are now marked Offline');

    if (currentUser?.id) {
      try {
        await supabase
          .from('profiles')
          .update({ is_available: next })
          .eq('id', currentUser.id);
      } catch (err) {
        console.error('Error updating availability:', err);
      }
    }
  }

  async function handleNotificationClick() {
    if ('Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification('Time Bank of India', {
            body: 'Notifications are enabled! You will be alerted when new tasks are available.',
            icon: '/logo.png',
          });
          showToast('Notifications enabled! Sent test notification.');
        } else {
          showToast('Notifications permission: ' + perm);
        }
      } catch (e) {
        showToast('Notification alert: Notifications are active for your account');
      }
    } else {
      showToast('Notifications are active for your account');
    }
  }

  function handleHelpSupport() {
    window.open('https://wa.me/919057987666?text=Hello%20Time%20Bank%20Support', '_blank');
  }

  function handleTaskHistory() {
    navigate('/volunteer/impact');
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-inner">
          <h2 className="page-title">Profile</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => { logout(); navigate('/'); }}>
            Sign Out
          </button>
        </div>
      </div>

      {toastMessage && (
        <div
          style={{
            margin: 'var(--space-2) var(--space-5)',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-primary)',
            color: 'white',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 600,
            textAlign: 'center',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {toastMessage}
        </div>
      )}

      <div style={{ padding: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
          <div className="avatar avatar-lg" style={{ background: '#27AE60' }}>
            {currentUser?.name?.[0] || 'V'}
          </div>
          <div>
            <h3 style={{ marginBottom: 4 }}>{currentUser?.name || 'Volunteer Member'}</h3>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 8 }}>
              Volunteer · {currentUser?.area || 'Colaba, Mumbai'}
            </div>
            <div className="flex items-center gap-2">
              <StarRating value={currentUser?.rating || 5.0} readonly size="sm" />
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                {(currentUser?.rating || 5.0).toFixed(1)} ({ratings?.length || 0} reviews)
              </span>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="flex justify-between items-center">
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={18} color="var(--color-primary)" />
              <span>Identity Verification</span>
            </div>
            <span className={`badge ${currentUser?.kyc_status === KYC_STATUS.VERIFIED || currentUser?.kyc?.status === KYC_STATUS.VERIFIED ? 'badge-kyc-verified' : 'badge-kyc-pending'}`}>
              {currentUser?.kyc_status === KYC_STATUS.VERIFIED || currentUser?.kyc?.status === KYC_STATUS.VERIFIED ? '✓ Verified' : 'Pending'}
            </span>
          </div>
        </div>

        <div className="stat-grid" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="stat-card">
            <div className="stat-value">{formatMinutes(currentUser?.volunteerStats?.hoursVolunteered || 0)}</div>
            <div className="stat-label">Time Given</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{currentUser?.volunteerStats?.tasksCompleted || 0}</div>
            <div className="stat-label">Tasks</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatMinutes(currentUser?.time_balance ?? currentUser?.timeBalance ?? 0)}</div>
            <div className="stat-label">My Balance</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{currentUser?.volunteerStats?.peopleHelped || 0}</div>
            <div className="stat-label">Helped</div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <h4 style={{ marginBottom: 'var(--space-4)' }}>Settings & Options</h4>

          {/* Availability Toggle */}
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Availability</div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                {available ? 'Currently available for new tasks' : 'Currently marked as away / offline'}
              </div>
            </div>
            <button
              onClick={handleToggleAvailability}
              style={{
                width: 52,
                height: 28,
                borderRadius: 14,
                background: available ? 'var(--color-success)' : 'var(--color-border)',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s ease',
              }}
              aria-label="Toggle availability"
              role="switch"
              aria-checked={available}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 3,
                  left: available ? 27 : 3,
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'white',
                  transition: 'left 0.2s ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                }}
              />
            </button>
          </div>

          <div className="divider" style={{ margin: 'var(--space-3) 0' }} />

          {/* Menu Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <button
              onClick={handleNotificationClick}
              className="flex items-center gap-3"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--space-3) 0', width: '100%', textAlign: 'left', fontFamily: 'var(--font-family)', fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)' }}
            >
              <Bell size={18} color="var(--color-text-secondary)" />
              <span>Notifications</span>
              <ChevronRight size={18} style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }} />
            </button>

            <button
              onClick={handleTaskHistory}
              className="flex items-center gap-3"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--space-3) 0', width: '100%', textAlign: 'left', fontFamily: 'var(--font-family)', fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)' }}
            >
              <History size={18} color="var(--color-text-secondary)" />
              <span>Task History & Impact</span>
              <ChevronRight size={18} style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }} />
            </button>

            <button
              onClick={handleHelpSupport}
              className="flex items-center gap-3"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--space-3) 0', width: '100%', textAlign: 'left', fontFamily: 'var(--font-family)', fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)' }}
            >
              <MessageCircle size={18} color="#25D366" />
              <span>Help & Support (WhatsApp)</span>
              <ChevronRight size={18} style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }} />
            </button>
          </div>
        </div>

        <button
          className="btn btn-outline btn-full"
          onClick={() => { logout(); navigate('/'); }}
          style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)', marginTop: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <Power size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
