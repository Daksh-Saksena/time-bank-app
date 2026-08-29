import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { KYC_STATUS, formatMinutes } from '../../constants';
import {
  Shield,
  MessageCircle,
  Power,
  ChevronRight,
  UserCheck,
} from 'lucide-react';

export default function AdminProfile() {
  const { currentUser, logout, requests } = useApp();
  const navigate = useNavigate();

  function handleHelpSupport() {
    window.open('https://wa.me/919057987666?text=Hello%20Time%20Bank%20Support', '_blank');
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-inner">
          <h2 className="page-title">Admin Profile</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => { logout(); navigate('/'); }}>
            Sign Out
          </button>
        </div>
      </div>
      <div style={{ padding: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
          <div className="avatar avatar-lg" style={{ background: '#8E44AD' }}>
            {currentUser?.name?.[0] || 'A'}
          </div>
          <div>
            <h3 style={{ marginBottom: 4 }}>{currentUser?.name || 'Pincode Admin'}</h3>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 4 }}>
              Pincode Administrator · {currentUser?.pincode || '400001'}
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              Managing {currentUser?.area || 'Colaba, Mumbai'}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <h4 style={{ marginBottom: 'var(--space-3)' }}>Admin Jurisdiction</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Assigned Pincode</span>
              <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{currentUser?.pincode || '400001'}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Area</span>
              <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{currentUser?.area || 'Colaba, Mumbai'}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Admin Status</span>
              <span className="badge badge-kyc-verified">Active Administrator</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <h4 style={{ marginBottom: 'var(--space-3)' }}>Quick Actions</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <button
              onClick={() => navigate('/admin/approvals')}
              className="flex items-center gap-3"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--space-3) 0', width: '100%', textAlign: 'left', fontFamily: 'var(--font-family)', fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)' }}
            >
              <UserCheck size={18} color="var(--color-primary)" />
              <span>Pending KYC Approvals</span>
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
