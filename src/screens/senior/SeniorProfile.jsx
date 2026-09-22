import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { KYC_STATUS, REQUEST_STATUS, formatMinutes, SERVICE_ICONS, SERVICE_LABELS } from '../../constants';
import {
  Bell,
  KeyRound,
  ClipboardList,
  MessageCircle,
  ShieldCheck,
  Power,
  ChevronRight,
  Globe,
  MapPin,
  HeartHandshake,
  Award,
} from 'lucide-react';

export default function SeniorProfile() {
  const { currentUser, seniorMode, toggleSeniorMode, logout, requests } = useApp();
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

  // Pure Seva statistics for this senior member
  const myRequests = requests.filter(
    (r) => r.seniorId === currentUser?.id || r.assignedVolunteerId === currentUser?.id
  );
  const completedSevas = myRequests.filter((r) =>
    [REQUEST_STATUS.COMPLETED, REQUEST_STATUS.RATED, REQUEST_STATUS.CLOSED].includes(r.status)
  );
  const completedCount = completedSevas.length;

  const now = new Date();
  const thisMonthCount = completedSevas.filter((r) => {
    const d = new Date(r.createdAt || r.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const totalSevaGiven = currentUser?.total_seva_minutes ?? currentUser?.time_balance ?? 0;

  return (
    <div className="page-content" style={{ paddingBottom: 80 }}>
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <h2 className="page-title">मेरा प्रोफ़ाइल (My Profile)</h2>
            <p className="page-subtitle">Time Bank of India — Pure Seva</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ fontWeight: 700 }}>
            लॉगआउट
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
        {/* User Identity Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
          <div
            className="avatar avatar-xl"
            style={{
              background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
              color: 'white',
              fontSize: '1.6rem',
              fontWeight: 800,
              boxShadow: '0 4px 12px rgba(30,58,138,0.25)',
            }}
          >
            {currentUser?.name?.[0] || 'S'}
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 2 }}>
              {currentUser?.name || 'Senior Member'}
            </h3>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 2, fontWeight: 600 }}>
              {currentUser?.phone || '+91 XXXXX XXXXX'}
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={13} color="var(--color-primary)" />
              <span>{currentUser?.area || 'Colaba, Mumbai'} · पिनकोड {currentUser?.pincode || '400001'}</span>
            </div>
          </div>
        </div>

        {/* Identity Verification Badge */}
        <div className="card" style={{ marginBottom: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
            <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}>
              <ShieldCheck size={20} color="var(--color-primary)" />
              <span>पहचान सत्यापन (Identity Verification)</span>
            </span>
            <span
              className={`badge ${
                currentUser?.kyc_status === KYC_STATUS.VERIFIED || currentUser?.kyc?.status === KYC_STATUS.VERIFIED
                  ? 'badge-kyc-verified'
                  : 'badge-kyc-pending'
              }`}
              style={{ fontWeight: 800 }}
            >
              {currentUser?.kyc_status === KYC_STATUS.VERIFIED || currentUser?.kyc?.status === KYC_STATUS.VERIFIED
                ? '✓ सत्यापित (Verified)'
                : 'प्रतीक्षारत (Pending)'}
            </span>
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            आधार (Aadhaar): •••• •••• {currentUser?.aadhaarLast4 || currentUser?.kyc?.aadhaarLast4 || 'XXXX'}
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* PURE SEVA MODEL DASHBOARD (No spendable time credits) */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <div
          className="card"
          style={{
            marginBottom: 'var(--space-4)',
            background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
            color: 'white',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-5)',
            boxShadow: '0 6px 20px rgba(30,58,138,0.25)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <HeartHandshake size={18} /> शुद्ध सेवा मॉडल (Pure Seva Model)
            </span>
            <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: 999, fontWeight: 700 }}>
              No Spendable Credits
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div style={{ background: 'rgba(255,255,255,0.12)', padding: '12px 14px', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: '0.78rem', opacity: 0.85, fontWeight: 600 }}>कुल सेवा योगदान (Total Seva Given)</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: 4 }}>
                {formatMinutes(totalSevaGiven)}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.12)', padding: '12px 14px', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: '0.78rem', opacity: 0.85, fontWeight: 600 }}>पूर्ण सेवाएँ (Sevas Completed)</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: 4 }}>
                {completedCount} सेवाएँ
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: 'rgba(255,255,255,0.12)', padding: '12px 14px', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: '0.78rem', opacity: 0.85, fontWeight: 600 }}>इस महीने (This Month)</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: 4 }}>
                {thisMonthCount} सेवाएँ
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.12)', padding: '12px 14px', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: '0.78rem', opacity: 0.85, fontWeight: 600 }}>समुदाय सहायता (Community Care)</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: 4 }}>
                100% नि:शुल्क
              </div>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* RECENT SEVA ACTIVITY */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <div className="card" style={{ marginBottom: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Award size={18} color="var(--color-primary)" /> हालिया सेवा गतिविधि (Seva Activity)
          </h4>

          {completedSevas.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', margin: 0, padding: '8px 0' }}>
              अभी तक कोई पूर्ण सेवा दर्ज नहीं है। जब कोई वालंटियर सहायता पूरी करेगा, यहाँ दिखेगा।
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {completedSevas.slice(0, 3).map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    background: '#F8FAFC',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.88rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1.2rem' }}>{SERVICE_ICONS[s.serviceType] || '🤝'}</span>
                    <div>
                      <div style={{ fontWeight: 700 }}>{SERVICE_LABELS[s.serviceType] || s.serviceType}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {s.assignedVolunteerName ? `सहायक: ${s.assignedVolunteerName}` : 'समुदाय सेवा'}
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-status-completed" style={{ fontSize: '0.75rem' }}>
                    पूर्ण (Completed)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* SETTINGS, ACCESSIBILITY & INTERNAL SCREENS */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <div className="card" style={{ marginBottom: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
          <h4 style={{ marginBottom: 'var(--space-4)', fontWeight: 800 }}>सुविधाएं व सेटिंग्स (Settings & Options)</h4>

          {/* Senior Citizen Mode Toggle */}
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 'var(--font-size-base)' }}>वरिष्ठ नागरिक मोड (Senior Mode)</div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                बड़ा टेक्स्ट और 56dp+ टच टारगेट
              </div>
            </div>
            <button
              onClick={toggleSeniorMode}
              style={{
                width: 54,
                height: 30,
                borderRadius: 15,
                background: seniorMode ? '#10B981' : 'var(--color-border)',
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
              <span
                style={{
                  position: 'absolute',
                  top: 3,
                  left: seniorMode ? 27 : 3,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'white',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                }}
              />
            </button>
          </div>

          <div className="divider" style={{ margin: 'var(--space-3) 0' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            {/* My Trusted Circle Internal Link */}
            <button
              onClick={() => navigate('/senior/trusted-circle')}
              className="flex items-center gap-3"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 'var(--space-3) 0',
                width: '100%',
                textAlign: 'left',
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--font-size-base)',
                color: 'var(--color-text-primary)',
              }}
            >
              <span style={{ fontSize: 20 }}>🤝</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>मेरा ट्रस्टेड सर्कल (My Trusted Circle)</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>पसंदीदा 10 सहायकों की सूची व प्रबंधन</div>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--color-text-muted)' }} />
            </button>

            {/* Nearby Map & Feed Internal Link */}
            <button
              onClick={() => navigate('/senior/nearby')}
              className="flex items-center gap-3"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 'var(--space-3) 0',
                width: '100%',
                textAlign: 'left',
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--font-size-base)',
                color: 'var(--color-text-primary)',
              }}
            >
              <MapPin size={20} color="var(--color-primary)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>आस-पास का नक्शा (Nearby Feed & Map)</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>क्षेत्र के स्वयंसेवक व मानचित्र</div>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--color-text-muted)' }} />
            </button>

            {/* Notifications */}
            <button
              onClick={handleNotificationClick}
              className="flex items-center gap-3"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 'var(--space-3) 0',
                width: '100%',
                textAlign: 'left',
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--font-size-base)',
                color: 'var(--color-text-primary)',
              }}
            >
              <Bell size={20} color="var(--color-text-secondary)" />
              <span style={{ fontWeight: 600 }}>सूचनाएं (Notifications)</span>
              <ChevronRight size={18} style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }} />
            </button>

            {/* Language Selector */}
            <button
              onClick={() => setLangModalOpen(true)}
              className="flex items-center gap-3"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 'var(--space-3) 0',
                width: '100%',
                textAlign: 'left',
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--font-size-base)',
                color: 'var(--color-text-primary)',
              }}
            >
              <Globe size={20} color="var(--color-primary)" />
              <span style={{ fontWeight: 600 }}>{t('language', 'Language')} / भाषा</span>
              <span style={{ marginLeft: 'auto', fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', fontWeight: 700 }}>
                {languages.find((l) => l.code === currentLang)?.nativeName || 'English'} ›
              </span>
            </button>

            {/* WhatsApp Help & Support */}
            <button
              onClick={handleHelpSupport}
              className="flex items-center gap-3"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 'var(--space-3) 0',
                width: '100%',
                textAlign: 'left',
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--font-size-base)',
                color: 'var(--color-text-primary)',
              }}
            >
              <MessageCircle size={20} color="#25D366" />
              <span style={{ fontWeight: 600 }}>{t('helpSupportWhatsApp', 'Help & Support (WhatsApp)')}</span>
              <ChevronRight size={18} style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }} />
            </button>
          </div>
        </div>

        {/* Large Accessible Logout Button */}
        <button
          className="btn btn-outline btn-full"
          onClick={handleLogout}
          style={{
            minHeight: 56,
            color: 'var(--color-danger)',
            borderColor: 'var(--color-danger)',
            marginTop: 'var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            fontSize: '1.05rem',
            fontWeight: 800,
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <Power size={20} />
          <span>लॉगआउट करें (Sign Out)</span>
        </button>
      </div>
    </div>
  );
}
