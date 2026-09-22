import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ROLES } from '../../constants';
import Modal from './Modal';
import { Users, HeartHandshake, Shield, Award, Clock } from 'lucide-react';

const ROLE_META = {
  [ROLES.SENIOR]: { icon: Users, label: 'Senior Citizen', color: 'var(--color-primary)', path: '/senior/home' },
  [ROLES.VOLUNTEER]: { icon: HeartHandshake, label: 'Volunteer', color: '#27AE60', path: '/volunteer/home' },
  [ROLES.ADMIN]: { icon: Shield, label: 'Pincode Admin', color: '#8E44AD', path: '/admin/dashboard' },
  [ROLES.SUPER_ADMIN]: { icon: Award, label: 'Super Admin', color: '#C0392B', path: '/admin/dashboard' },
};

export default function RoleSwitcherModal({ isOpen, onClose }) {
  const { currentUser, switchRole } = useApp();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);

  const roles = currentUser?.roles || [currentUser?.role || ROLES.SENIOR];
  const activeRole = currentUser?.active_role || currentUser?.role || ROLES.SENIOR;

  async function handleSwitch(role) {
    if (role === activeRole) { onClose(); return; }
    setSwitching(true);
    await switchRole(role);
    setSwitching(false);
    onClose();
    const meta = ROLE_META[role];
    if (meta?.path) navigate(meta.path);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Switch Role">
      <div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)' }}>
          You have {roles.length} role{roles.length > 1 ? 's' : ''}. Tap to switch.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {roles.map((role) => {
            const meta = ROLE_META[role] || { icon: Users, label: role, color: 'var(--color-primary)', path: '/' };
            const RoleIcon = meta.icon;
            const isActive = role === activeRole;
            const needsApproval = role === ROLES.ADMIN && !currentUser?.pincode_admin_approved;
            return (
              <button
                key={role}
                onClick={() => !needsApproval && handleSwitch(role)}
                disabled={switching || needsApproval}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)',
                  border: `2px solid ${isActive ? meta.color : 'var(--color-border)'}`,
                  background: isActive ? `${meta.color}15` : 'white',
                  cursor: needsApproval ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-family)', width: '100%', textAlign: 'left',
                  opacity: needsApproval ? 0.6 : 1,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 10, background: `${meta.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <RoleIcon size={22} color={meta.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: isActive ? meta.color : 'var(--color-text-primary)', marginBottom: 2 }}>
                    {meta.label}
                    {isActive && <span style={{ marginLeft: 8, fontSize: 'var(--font-size-xs)', background: meta.color, color: 'white', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>Active</span>}
                  </div>
                  {needsApproval && (
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} /> Pending Super Admin Approval
                    </div>
                  )}
                </div>
                {!needsApproval && !isActive && (
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-lg)' }}>→</span>
                )}
              </button>
            );
          })}
        </div>
        {roles.length === 1 && (
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 'var(--space-4)' }}>
            You can add more roles during onboarding or contact an admin.
          </p>
        )}
      </div>
    </Modal>
  );
}
