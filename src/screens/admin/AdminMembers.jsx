import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ROLES, KYC_STATUS, formatMinutes } from '../../data/mockData';
import StarRating from '../../components/common/StarRating';
import Modal from '../../components/common/Modal';
const roleFilters = [
  { value: 'all', label: 'All' },
  { value: ROLES.SENIOR, label: ' Seniors' },
  { value: ROLES.VOLUNTEER, label: ' Volunteers' },
  { value: ROLES.ADMIN, label: ' Admin' },
];
export default function AdminMembers() {
  const { members } = useApp();
  const [filterRole, setFilterRole] = useState('all');
  const [selectedMember, setSelectedMember] = useState(null);
  const filtered = filterRole === 'all' ? members : members.filter((m) => m.role === filterRole);
  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <h2 className="page-title">Members</h2>
            <p className="page-subtitle">Pincode 400001 · {members.length} members</p>
          </div>
        </div>
      </div>
      <div className="filter-pills">
        {roleFilters.map(({ value, label }) => (
          <button key={value} className={`filter-pill${filterRole === value ? ' active' : ''}`} onClick={() => setFilterRole(value)}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ padding: '0 var(--space-5)' }}>
        {filtered.map((member) => (
          <div
            key={member.id}
            className="card"
            style={{ marginBottom: 'var(--space-3)', cursor: 'pointer' }}
            onClick={() => setSelectedMember(member)}
          >
            <div className="flex items-center gap-3">
              <div className="avatar" style={{ background: member.role === ROLES.VOLUNTEER ? '#27AE60' : member.role === ROLES.ADMIN ? '#8E44AD' : 'var(--color-primary)' }}>
                {member.name[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{member.name}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  {member.role === ROLES.SENIOR ? ' Senior' : member.role === ROLES.VOLUNTEER ? ' Volunteer' : ' Admin'} · {member.area}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`badge ${member.kyc?.status === KYC_STATUS.VERIFIED ? 'badge-kyc-verified' : 'badge-kyc-pending'}`} style={{ fontSize: '10px' }}>
                  {member.kyc?.status === KYC_STATUS.VERIFIED ? '✓' : ''}
                </span>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
                  {formatMinutes(member.timeBalance || 0)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Modal isOpen={!!selectedMember} onClose={() => setSelectedMember(null)} title="Member Profile">
        {selectedMember && (
          <div>
            <div className="flex items-center gap-4" style={{ marginBottom: 'var(--space-5)' }}>
              <div className="avatar avatar-lg" style={{ background: selectedMember.role === ROLES.VOLUNTEER ? '#27AE60' : 'var(--color-primary)' }}>
                {selectedMember.name[0]}
              </div>
              <div>
                <h3>{selectedMember.name}</h3>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                  {selectedMember.role === ROLES.SENIOR ? ' Senior Citizen' : selectedMember.role === ROLES.VOLUNTEER ? ' Volunteer' : ' Admin'}
                </div>
                <StarRating value={selectedMember.rating || 0} readonly size="sm" />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
              {[
                { label: 'Phone', value: selectedMember.phone },
                { label: 'Age', value: selectedMember.age },
                { label: 'Area', value: `${selectedMember.area} · ${selectedMember.pincode}` },
                { label: 'KYC', value: selectedMember.kyc?.status === KYC_STATUS.VERIFIED ? '✓ Verified' : ' Pending' },
                { label: 'Time Balance', value: formatMinutes(selectedMember.timeBalance || 0) },
                { label: 'Member Since', value: selectedMember.memberSince },
                ...(selectedMember.volunteerStats ? [
                  { label: 'Tasks Done', value: selectedMember.volunteerStats.tasksCompleted },
                  { label: 'People Helped', value: selectedMember.volunteerStats.peopleHelped },
                ] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>{label}</span>
                  <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{value}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost btn-full" onClick={() => setSelectedMember(null)}>Close</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
