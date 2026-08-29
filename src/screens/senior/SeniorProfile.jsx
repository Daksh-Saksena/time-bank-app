import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { KYC_STATUS, formatMinutes } from '../../constants';
import {
  Bell,
  KeyRound,
  ClipboardList,
  MessageCircle,
  ShieldCheck,
  Power,
  ChevronRight,
  Globe,
} from 'lucide-react';

export default function SeniorProfile() {
  const { currentUser, seniorMode, toggleSeniorMode, logout } = useApp();
  const { t, currentLang, languages, setLangModalOpen } = useLanguage();
  const navigate = useNavigate();
  const [toastMessage, setToastMessage] = useState('');

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  async function handleNotificationClick() {
    if ('Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification('Time Bank of India', {
            body: 'Notifications enabled! You will receive updates about your service requests.',
            icon: '/logo.png',
          });
          showToast('Notifications enabled! Sent test notification.');
        } else {
          showToast('Notifications permission: ' + perm);
        }
      } catch (e) {
        showToast('Notifications are active for your account');
      }
    } else {
      showToast('Notifications are active for your account');
    }
  }

  function handleHelpSupport() {
    window.open('https://wa.me/919057987666?text=Hello%20Time%20Bank%20Support', '_blank');
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-inner">
          <h2 className="page-title">My Profile</h2>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Sign Out</button>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
          <div className="avatar avatar-xl" style={{ background: 'var(--color-primary)' }}>
            {currentUser?.name?.[0] || 'S'}
          </div>
          <div>
            <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 4 }}>{currentUser?.name || 'Senior Member'}</h3>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 4 }}>
              {currentUser?.phone || '+91 XXXXX XXXXX'}
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              {currentUser?.area || 'Colaba, Mumbai'} · Age {currentUser?.age || 70}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-3)' }}>
            <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={18} color="var(--color-primary)" />
              <span>Identity Verification</span>
            </span>
            <span className={`badge ${currentUser?.kyc_status === KYC_STATUS.VERIFIED || currentUser?.kyc?.status === KYC_STATUS.VERIFIED ? 'badge-kyc-verified' : 'badge-kyc-pending'}`}>
              {currentUser?.kyc_status === KYC_STATUS.VERIFIED || currentUser?.kyc?.status === KYC_STATUS.VERIFIED ? '✓ Verified' : 'Pending'}
            </span>
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            Aadhaar: •••• •••• {currentUser?.aadhaarLast4 || currentUser?.kyc?.aadhaarLast4 || 'XXXX'}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="flex justify-between items-center">
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--font-size-base)' }}>Time Balance</div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Available to receive help</div>
            </div>
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-primary)' }}>
              {formatMinutes(currentUser?.time_balance || currentUser?.timeBalance || 120)}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <h4 style={{ marginBottom: 'var(--space-4)' }}>Settings & Options</h4>
          
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--font-size-base)' }}>Senior Citizen Mode</div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                Larger text and buttons
              </div>
            </div>
            <button
              onClick={toggleSeniorMode}
              style={{
                width: 52,
                height: 28,
                borderRadius: 14,
                background: seniorMode ? 'var(--color-primary)' : 'var(--color-border)',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
              aria-label="Toggle senior mode"
              aria-checked={seniorMode}
              role="switch"
            >
              <span style={{
                position: 'absolute',
                top: 3,
                left: seniorMode ? 27 : 3,
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'white',
                transition: 'left 0.2s',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>

          <div className="divider" style={{ margin: 'var(--space-3) 0' }} />

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
              onClick={() => showToast('Session PIN is set to default')}
              className="flex items-center gap-3"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--space-3) 0', width: '100%', textAlign: 'left', fontFamily: 'var(--font-family)', fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)' }}
            >
              <KeyRound size={18} color="var(--color-text-secondary)" />
              <span>Security & Session PIN</span>
              <ChevronRight size={18} style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }} />
            </button>

            <button
              onClick={() => navigate('/senior/nearby')}
              className="flex items-center gap-3"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--space-3) 0', width: '100%', textAlign: 'left', fontFamily: 'var(--font-family)', fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)' }}
            >
              <ClipboardList size={18} color="var(--color-text-secondary)" />
              <span>My Requests & Status</span>
              <ChevronRight size={18} style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }} />
            </button>

            <button
              onClick={() => setLangModalOpen(true)}
              className="flex items-center gap-3"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--space-3) 0', width: '100%', textAlign: 'left', fontFamily: 'var(--font-family)', fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)' }}
            >
              <Globe size={18} color="var(--color-primary)" />
              <span>{t('language', 'Language')} / भाषा</span>
              <span style={{ marginLeft: 'auto', fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', fontWeight: 700 }}>
                {languages.find((l) => l.code === currentLang)?.nativeName || 'English'} ›
              </span>
            </button>

            <button
              onClick={handleHelpSupport}
              className="flex items-center gap-3"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--space-3) 0', width: '100%', textAlign: 'left', fontFamily: 'var(--font-family)', fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)' }}
            >
              <MessageCircle size={18} color="#25D366" />
              <span>{t('helpSupportWhatsApp', 'Help & Support (WhatsApp)')}</span>
              <ChevronRight size={18} style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }} />
            </button>
          </div>
        </div>

        <button
          className="btn btn-outline btn-full"
          onClick={handleLogout}
          style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)', marginTop: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <Power size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
