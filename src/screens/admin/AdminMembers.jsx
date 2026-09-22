import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ROLES, KYC_STATUS, REQUEST_STATUS, formatMinutes } from '../../constants';
import StarRating from '../../components/common/StarRating';
import Modal from '../../components/common/Modal';
import { ShieldCheck, UserCheck, Star, Clock, CheckCircle, Users } from 'lucide-react';
import { getPincodeLocation } from '../../lib/geo';

const roleFilters = [
  { value: 'all', label: 'All' },
  { value: ROLES.SENIOR, label: 'Seniors' },
  { value: ROLES.VOLUNTEER, label: 'Volunteers' },
  { value: ROLES.ADMIN, label: 'Admin' },
];

export default function AdminMembers() {
  const { members, requests, currentUser, isSuperAdmin, getVolunteerMetrics, approvePincodeAdmin } = useApp();
  const [filterRole, setFilterRole] = useState('all');
  const [selectedMember, setSelectedMember] = useState(null);
  const [actionDoneMsg, setActionDoneMsg] = useState('');

  // Scoping: Pincode Admin sees their pincode, Super Admin sees all
  const scopedMembers = isSuperAdmin || !currentUser?.pincode
    ? members
    : members.filter((m) => m.pincode === currentUser.pincode);

  const filtered = filterRole === 'all'
    ? scopedMembers
    : scopedMembers.filter((m) => m.role === filterRole || (m.roles || []).includes(filterRole));

  const currentGeo = getPincodeLocation(currentUser?.pincode, currentUser?.area);

  // Helper to compute member metrics
  const getSeniorStats = (seniorId) => {
    const sReqs = requests.filter((r) => r.seniorId === seniorId || r.senior_id === seniorId);
    const completed = sReqs.filter((r) => [REQUEST_STATUS.COMPLETED, REQUEST_STATUS.RATED, REQUEST_STATUS.CLOSED].includes(r.status));
    return { total: sReqs.length, completed: completed.length };
  };

  const handleApproveAdminRole = async (memberId) => {
    await approvePincodeAdmin(memberId);
    setActionDoneMsg('Pincode Admin role approved!');
    setSelectedMember((prev) => (prev ? { ...prev, pincode_admin_approved: true } : prev));
    setTimeout(() => setActionDoneMsg(''), 2500);
  };

  const selectedMetrics = selectedMember && (selectedMember.role === ROLES.VOLUNTEER || (selectedMember.roles || []).includes(ROLES.VOLUNTEER))
    ? getVolunteerMetrics(selectedMember.id)
    : null;

  const selectedSeniorStats = selectedMember && (selectedMember.role === ROLES.SENIOR || (selectedMember.roles || []).includes(ROLES.SENIOR))
    ? getSeniorStats(selectedMember.id)
    : null;

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <h2 className="page-title">Member Directory</h2>
            <p className="page-subtitle">
              {isSuperAdmin
                ? `Super Admin Oversight · ${scopedMembers.length} members nationwide`
                : `Pincode ${currentUser?.pincode || '400001'} (${currentGeo.full}) · ${scopedMembers.length} members`}
            </p>
          </div>
        </div>
      </div>

      {/* Role Filter Pills */}
      <div className="filter-pills">
        {roleFilters.map(({ value, label }) => {
          const count = value === 'all'
            ? scopedMembers.length
            : scopedMembers.filter((m) => m.role === value || (m.roles || []).includes(value)).length;
          return (
            <button
              key={value}
              className={`filter-pill${filterRole === value ? ' active' : ''}`}
              onClick={() => setFilterRole(value)}
              style={{ fontWeight: filterRole === value ? 800 : 600 }}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Member Cards */}
      <div style={{ padding: '0 var(--space-5)' }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <Users size={36} color="var(--color-text-muted)" />
            </div>
            <h3>No members found</h3>
            <p>No members match the selected filter in this area.</p>
          </div>
        ) : (
          filtered.map((member) => {
            const isVol = member.role === ROLES.VOLUNTEER || (member.roles || []).includes(ROLES.VOLUNTEER);
            const isSen = member.role === ROLES.SENIOR || (member.roles || []).includes(ROLES.SENIOR);
            const isAdm = member.role === ROLES.ADMIN || (member.roles || []).includes(ROLES.ADMIN);
            const volM = isVol ? getVolunteerMetrics(member.id) : null;
            const senM = isSen ? getSeniorStats(member.id) : null;
            const memGeo = getPincodeLocation(member.pincode, member.area);

            return (
              <div
                key={member.id}
                className="card"
                style={{ marginBottom: 'var(--space-3)', cursor: 'pointer' }}
                onClick={() => {
                  setSelectedMember(member);
                  setActionDoneMsg('');
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="avatar"
                    style={{
                      background: isAdm ? '#7E22CE' : isVol ? '#16A34A' : 'var(--color-primary)',
                      color: 'white',
                      fontWeight: 800,
                    }}
                  >
                    {member.name?.[0] || 'M'}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{member.name}</span>
                      {member.roles?.includes('admin') && !member.pincode_admin_approved && (
                        <span style={{ fontSize: '0.68rem', background: '#F3E8FF', color: '#7E22CE', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                          Admin Applicant
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      {isSen ? 'Senior Citizen' : isVol ? 'Volunteer' : 'Administrator'} · {memGeo.full}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span
                      className={`badge ${member.kyc_status === KYC_STATUS.VERIFIED || member.kyc?.status === KYC_STATUS.VERIFIED ? 'badge-kyc-verified' : 'badge-kyc-pending'}`}
                      style={{ fontSize: '10px' }}
                    >
                      {member.kyc_status === KYC_STATUS.VERIFIED || member.kyc?.status === KYC_STATUS.VERIFIED ? '✓ Verified' : 'Pending KYC'}
                    </span>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4, fontWeight: 600 }}>
                      {isVol && `${formatMinutes(volM.totalSevaMinutes)} Seva`}
                      {isSen && `${senM.total} Request${senM.total === 1 ? '' : 's'}`}
                      {isAdm && !isVol && !isSen && 'Admin Role'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Member Details Modal */}
      <Modal isOpen={!!selectedMember} onClose={() => setSelectedMember(null)} title="Member Details">
        {selectedMember && (
          <div>
            <div className="flex items-center gap-4" style={{ marginBottom: 'var(--space-4)' }}>
              <div
                className="avatar avatar-lg"
                style={{
                  background: selectedMember.role === ROLES.VOLUNTEER ? '#16A34A' : selectedMember.role === ROLES.ADMIN ? '#7E22CE' : 'var(--color-primary)',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: '1.5rem',
                }}
              >
                {selectedMember.name?.[0] || 'M'}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontWeight: 800 }}>{selectedMember.name}</h3>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                  {selectedMember.role === ROLES.SENIOR ? 'Senior Citizen' : selectedMember.role === ROLES.VOLUNTEER ? 'Volunteer (Sevak)' : 'Administrator'}
                </div>

                {/* Rating display: "No reviews yet" if no reviews */}
                {selectedMetrics ? (
                  selectedMetrics.reviewCount > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)' }}>
                      <Star size={14} fill="#F59E0B" color="#F59E0B" />
                      <strong>{selectedMetrics.avgRating}</strong>
                      <span style={{ color: 'var(--color-text-muted)' }}>({selectedMetrics.reviewCount} review{selectedMetrics.reviewCount === 1 ? '' : 's'})</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      No reviews yet (New Sevak)
                    </div>
                  )
                ) : null}
              </div>
            </div>

            {actionDoneMsg && (
              <div style={{ padding: 10, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#16A34A', borderRadius: 8, marginBottom: 12, fontWeight: 700, fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>
                {actionDoneMsg}
              </div>
            )}

            {/* Pincode Admin Applicant Approval for Super Admin */}
            {selectedMember.roles?.includes('admin') && !selectedMember.pincode_admin_approved && (
              <div style={{ background: '#F3E8FF', border: '1px solid #D8B4FE', borderRadius: 8, padding: 12, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6B21A8', fontWeight: 700, fontSize: 'var(--font-size-sm)', marginBottom: 4 }}>
                  <ShieldCheck size={16} color="#7E22CE" />
                  <span>Pincode Admin Role Applicant</span>
                </div>
                <p style={{ fontSize: 'var(--font-size-xs)', color: '#581C87', margin: '0 0 10px' }}>
                  This user has applied to administer Pincode {selectedMember.pincode}. Super Admin approval is required.
                </p>
                {isSuperAdmin ? (
                  <button
                    className="btn btn-sm"
                    style={{ background: '#7E22CE', color: 'white', fontWeight: 700, border: 'none', borderRadius: 6, padding: '6px 14px' }}
                    onClick={() => handleApproveAdminRole(selectedMember.id)}
                  >
                    ✓ Approve Pincode Admin Role
                  </button>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: '#7E22CE', fontStyle: 'italic' }}>
                    Awaiting Super Administrator review & approval
                  </span>
                )}
              </div>
            )}

            {/* Pure Seva Metrics & Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
              {[
                { label: 'Phone', value: selectedMember.phone || '-' },
                { label: 'Age / DOB', value: selectedMember.dob ? new Date(selectedMember.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : selectedMember.age ? `Age: ${selectedMember.age}` : '-' },
                { label: 'Area / Pincode', value: getPincodeLocation(selectedMember.pincode, selectedMember.area).full + ` (${selectedMember.pincode || '400001'})` },
                { label: 'KYC Status', value: selectedMember.kyc_status === KYC_STATUS.VERIFIED || selectedMember.kyc?.status === KYC_STATUS.VERIFIED ? '✓ Verified' : 'Pending Verification' },
                { label: 'Member Since', value: selectedMember.member_since || selectedMember.memberSince || selectedMember.created_at?.slice(0, 7) || '2026-01' },
                // Pure Seva Volunteer Metrics
                ...(selectedMetrics ? [
                  { label: 'Total Seva Given', value: formatMinutes(selectedMetrics.totalSevaMinutes) },
                  { label: 'Tasks Completed', value: `${selectedMetrics.tasksCompleted} tasks` },
                  { label: 'People Helped', value: `${selectedMetrics.peopleHelped} seniors` },
                  { label: 'This Month', value: `${formatMinutes(selectedMetrics.thisMonthMinutes)} (${selectedMetrics.thisMonthTasks} tasks)` },
                ] : []),
                // Senior Citizen Stats
                ...(selectedSeniorStats ? [
                  { label: 'Requests Created', value: `${selectedSeniorStats.total} requests` },
                  { label: 'Requests Completed', value: `${selectedSeniorStats.completed} completed` },
                ] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>{label}</span>
                  <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', textAlign: 'right' }}>{value}</span>
                </div>
              ))}
            </div>

            <button className="btn btn-ghost btn-full" onClick={() => setSelectedMember(null)}>
              Close
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
