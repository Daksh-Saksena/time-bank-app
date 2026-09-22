import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import StarRating from '../../components/common/StarRating';
import SevaSummaryCard from '../../components/common/SevaSummaryCard';
import RoleSwitcherModal from '../../components/common/RoleSwitcherModal';
import { formatMinutes, KYC_STATUS, VOLUNTEER_STATUS, isDND } from '../../constants';
import {
  Bell,
  History,
  MessageCircle,
  ShieldCheck,
  Power,
  ChevronRight,
  Globe,
  HeartHandshake,
  Repeat,
  Moon,
  Award,
} from 'lucide-react';

export default function VolunteerProfile() {
  const {
    currentUser,
    logout,
    updateVolunteerStatus,
    getVolunteerMetrics,
    requests,
  } = useApp();
  const { t, currentLang, languages, setLangModalOpen } = useLanguage();
  const navigate = useNavigate();

  const metrics = getVolunteerMetrics();
  const [volunteerStatus, setVolunteerStatus] = useState(currentUser?.volunteer_status || VOLUNTEER_STATUS.AVAILABLE);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const isNightDND = isDND();
  const roles = currentUser?.roles || [currentUser?.role || 'volunteer'];

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  }

  async function handleStatusChange(newStatus) {
    setVolunteerStatus(newStatus);
    await updateVolunteerStatus(newStatus);
    const labels = {
      [VOLUNTEER_STATUS.AVAILABLE]: '🟢 You are now Available for requests',
      [VOLUNTEER_STATUS.BUSY]: '🟡 You are now Busy — not accepting new requests',
      [VOLUNTEER_STATUS.DND]: '🔴 Do Not Disturb — notifications paused',
    };
    showToast(labels[newStatus] || 'Status updated');
  }

  async function handleNotificationClick() {
    if ('Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification('Time Bank of India', {
            body: 'Notifications enabled! You will be alerted when new seva tasks are posted nearby.',
            icon: '/logo.png',
          });
          showToast('Notifications enabled! Test notification sent.');
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
    <div className="page-content" style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <h2 className="page-title">स्वयंसेवक प्रोफ़ाइल (Volunteer Profile)</h2>
            <p className="page-subtitle">Time Bank of India — Pure Seva</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => { logout(); navigate('/'); }} style={{ fontWeight: 700 }}>
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
        {/* Volunteer Identity Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
          <div
            className="avatar avatar-xl"
            style={{
              background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
              color: 'white',
              fontSize: '1.6rem',
              fontWeight: 800,
              boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
            }}
          >
            {currentUser?.name?.[0] || 'V'}
          </div>
          <div>
            <h3 style={{ marginBottom: 2, fontSize: '1.25rem', fontWeight: 800 }}>
              {currentUser?.name || 'Volunteer Member'}
            </h3>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 600 }}>
              सेवाभावी सदस्य · {currentUser?.area || 'Local Area'} (पिनकोड {currentUser?.pincode || '400001'})
            </div>

            {/* Rating display: Only show rating if at least 1 review exists */}
            <div className="flex items-center gap-2">
              {metrics.reviewCount > 0 ? (
                <>
                  <StarRating value={parseFloat(metrics.avgRating)} readonly size="sm" />
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {metrics.avgRating} ({metrics.reviewCount} reviews)
                  </span>
                </>
              ) : (
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--color-text-muted)',
                    background: '#F1F5F9',
                    padding: '3px 10px',
                    borderRadius: 999,
                  }}
                >
                  ⭐ No reviews yet (नया स्वयंसेवक)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* KYC Verification Card */}
        <div className="card" style={{ marginBottom: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
          <div className="flex justify-between items-center">
            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}>
              <ShieldCheck size={20} color="var(--color-primary)" />
              <span>पहचान सत्यापन (Identity Verification)</span>
            </div>
            <span
              className={`badge ${
                currentUser?.kyc_status === KYC_STATUS.VERIFIED || currentUser?.kyc?.status === KYC_STATUS.VERIFIED
                  ? 'badge-kyc-verified'
                  : 'badge-kyc-pending'
              }`}
              style={{ fontWeight: 800 }}
            >
              {currentUser?.kyc_status === KYC_STATUS.VERIFIED || currentUser?.kyc?.status === KYC_STATUS.VERIFIED
                ? '✓ Verified'
                : 'Pending'}
            </span>
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
            आधार (Aadhaar): •••• •••• {currentUser?.aadhaarLast4 || currentUser?.kyc?.aadhaarLast4 || 'XXXX'}
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* PURE SEVA STATS GRID (Single Source of Truth, No My Balance) */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <div className="stat-grid" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="stat-card" style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: '14px', border: '1px solid var(--color-border)' }}>
            <div className="stat-value" style={{ color: '#16A34A', fontSize: '1.5rem', fontWeight: 800 }}>
              {formatMinutes(metrics.totalSevaMinutes)}
            </div>
            <div className="stat-label" style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginTop: 4 }}>
              Total Seva Given
            </div>
          </div>

          <div className="stat-card" style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: '14px', border: '1px solid var(--color-border)' }}>
            <div className="stat-value" style={{ color: '#2563EB', fontSize: '1.5rem', fontWeight: 800 }}>
              {metrics.tasksCompleted}
            </div>
            <div className="stat-label" style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginTop: 4 }}>
              Tasks Completed
            </div>
          </div>

          <div className="stat-card" style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: '14px', border: '1px solid var(--color-border)' }}>
            <div className="stat-value" style={{ color: '#D97706', fontSize: '1.5rem', fontWeight: 800 }}>
              {metrics.peopleHelped}
            </div>
            <div className="stat-label" style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginTop: 4 }}>
              People Helped
            </div>
          </div>

          <div className="stat-card" style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: '14px', border: '1px solid var(--color-border)' }}>
            <div className="stat-value" style={{ color: '#7E22CE', fontSize: '1.5rem', fontWeight: 800 }}>
              {metrics.thisMonthTasks}
            </div>
            <div className="stat-label" style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginTop: 4 }}>
              This Month
            </div>
          </div>
        </div>

        {/* Monthly Seva Summary Card + Certificate (Uses coherent metrics) */}
        <SevaSummaryCard user={currentUser} requests={requests} />

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* AVAILABILITY & SETTINGS */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <div className="card" style={{ marginBottom: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
          <h4 style={{ marginBottom: 'var(--space-4)', fontWeight: 800 }}>उपलब्धता व सेटिंग्स (Settings & Options)</h4>

          {/* Volunteer Status 3-state */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 8 }}>मेरी उपलब्धता (My Availability):</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { status: VOLUNTEER_STATUS.AVAILABLE, label: '🟢 Ready', color: '#16A34A', bg: '#DCFCE7' },
                { status: VOLUNTEER_STATUS.BUSY, label: '🟡 Busy', color: '#D97706', bg: '#FEF3C7' },
                { status: VOLUNTEER_STATUS.DND, label: '🔴 DND', color: '#DC2626', bg: '#FEE2E2' },
              ].map(({ status, label, color, bg }) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleStatusChange(status)}
                  style={{
                    flex: 1,
                    minHeight: 46,
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${volunteerStatus === status ? color : 'var(--color-border)'}`,
                    background: volunteerStatus === status ? bg : 'white',
                    color: volunteerStatus === status ? color : 'var(--color-text-muted)',
                    fontWeight: volunteerStatus === status ? 800 : 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* DND Description & Night Notice */}
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
              {volunteerStatus === VOLUNTEER_STATUS.DND ? '🔴 Do Not Disturb: नए अनुरोधों की सूचनाएं मौन रहेंगी' :
               volunteerStatus === VOLUNTEER_STATUS.BUSY ? '🟡 Busy: आप अभी नए अनुरोध स्वीकार नहीं कर रहे हैं' :
               '🟢 Ready: आपके आस-पास के सेवा अनुरोधों की सूचना प्राप्त होगी'}
            </div>

            {isNightDND && (
              <div style={{ marginTop: 8, padding: '6px 10px', background: '#F3E8FF', borderRadius: 6, fontSize: '0.75rem', color: '#6B21A8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Moon size={14} /> 10 PM–6 AM Night DND सक्रिय है
              </div>
            )}
          </div>

          <div className="divider" style={{ margin: 'var(--space-3) 0' }} />

          {/* Menu Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            {/* Multi-role switcher */}
            {roles.length > 1 && (
              <button
                type="button"
                onClick={() => setRoleSwitcherOpen(true)}
                className="flex items-center gap-3"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--space-3) 0', width: '100%', textAlign: 'left', fontFamily: 'var(--font-family)', fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)' }}
              >
                <Repeat size={18} color="var(--color-primary)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>भूमिका बदलें (Switch Role)</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>आपके पास {roles.length} भूमिकाएं हैं</div>
                </div>
                <ChevronRight size={18} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            )}

            {/* Task History & Impact */}
            <button
              type="button"
              onClick={() => navigate('/volunteer/impact')}
              className="flex items-center gap-3"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--space-3) 0', width: '100%', textAlign: 'left', fontFamily: 'var(--font-family)', fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)' }}
            >
              <History size={18} color="#2563EB" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>सेवा इतिहास व प्रभाव (Task History & Impact)</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>पूर्ण किए गए कार्य और मील के पत्थर</div>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--color-text-muted)' }} />
            </button>

            {/* Seva Wall / Leaderboard */}
            <button
              type="button"
              onClick={() => navigate('/leaderboard')}
              className="flex items-center gap-3"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--space-3) 0', width: '100%', textAlign: 'left', fontFamily: 'var(--font-family)', fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)' }}
            >
              <Award size={18} color="#F59E0B" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>सेवा दीवार (Seva Wall & Certificate)</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>स्थानीय व राष्ट्रीय प्रेरणा सूची</div>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--color-text-muted)' }} />
            </button>

            {/* Notifications */}
            <button
              type="button"
              onClick={handleNotificationClick}
              className="flex items-center gap-3"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--space-3) 0', width: '100%', textAlign: 'left', fontFamily: 'var(--font-family)', fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)' }}
            >
              <Bell size={18} color="var(--color-text-secondary)" />
              <span style={{ fontWeight: 600 }}>सूचनाएं (Notifications)</span>
              <ChevronRight size={18} style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }} />
            </button>

            {/* Language */}
            <button
              type="button"
              onClick={() => setLangModalOpen(true)}
              className="flex items-center gap-3"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--space-3) 0', width: '100%', textAlign: 'left', fontFamily: 'var(--font-family)', fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)' }}
            >
              <Globe size={18} color="var(--color-primary)" />
              <span style={{ fontWeight: 600 }}>{t('language', 'Language')} / भाषा</span>
              <span style={{ marginLeft: 'auto', fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', fontWeight: 700 }}>
                {languages.find((l) => l.code === currentLang)?.nativeName || 'English'} ›
              </span>
            </button>

            {/* Support */}
            <button
              type="button"
              onClick={handleHelpSupport}
              className="flex items-center gap-3"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--space-3) 0', width: '100%', textAlign: 'left', fontFamily: 'var(--font-family)', fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)' }}
            >
              <MessageCircle size={18} color="#25D366" />
              <span style={{ fontWeight: 600 }}>{t('helpSupportWhatsApp', 'Help & Support (WhatsApp)')}</span>
              <ChevronRight size={18} style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }} />
            </button>
          </div>
        </div>

        {/* Large Sign Out Button */}
        <button
          className="btn btn-outline btn-full"
          onClick={() => { logout(); navigate('/'); }}
          style={{
            minHeight: 54,
            color: 'var(--color-danger)',
            borderColor: 'var(--color-danger)',
            marginTop: 'var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontSize: '1.05rem',
            fontWeight: 800,
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <Power size={18} />
          <span>लॉगआउट करें (Sign Out)</span>
        </button>
      </div>

      {/* Role Switcher Modal */}
      <RoleSwitcherModal
        isOpen={roleSwitcherOpen}
        onClose={() => setRoleSwitcherOpen(false)}
      />
    </div>
  );
}
