import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { KYC_STATUS, ROLES } from '../../data/mockData';
import Modal from '../../components/common/Modal';
function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
export default function PendingApprovals() {
  const { pendingApprovals, approveUser, rejectUser } = useApp();
  const [selectedUser, setSelectedUser] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [actionDone, setActionDone] = useState({});
  function handleApprove(id) {
    setProcessing(id);
    setTimeout(() => {
      approveUser(id);
      setActionDone((prev) => ({ ...prev, [id]: 'approved' }));
      setSelectedUser(null);
      setProcessing(null);
    }, 1000);
  }
  function handleReject(id) {
    setProcessing(id);
    setTimeout(() => {
      rejectUser(id);
      setActionDone((prev) => ({ ...prev, [id]: 'rejected' }));
      setSelectedUser(null);
      setProcessing(null);
    }, 800);
  }
  const roleLabel = (role) => role === ROLES.SENIOR ? ' Senior' : role === ROLES.VOLUNTEER ? ' Volunteer' : ' Admin';
  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <h2 className="page-title">Pending Approvals</h2>
            <p className="page-subtitle">{pendingApprovals.length} awaiting review</p>
          </div>
        </div>
      </div>
      <div style={{ padding: 'var(--space-5)' }}>
        {pendingApprovals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"></div>
            <h3>All Caught Up!</h3>
            <p style={{ fontSize: 'var(--font-size-sm)' }}>No pending approvals at this time.</p>
          </div>
        ) : (
          pendingApprovals.map((user) => (
            <div key={user.id} className="card" style={{ marginBottom: 'var(--space-4)', position: 'relative' }}>
              {actionDone[user.id] && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: actionDone[user.id] === 'approved' ? 'rgba(39,174,96,0.1)' : 'rgba(192,57,43,0.1)', borderRadius: 'var(--radius-lg)', zIndex: 1 }}>
                  <span style={{ fontSize: '2rem' }}>{actionDone[user.id] === 'approved' ? '' : ''}</span>
                </div>
              )}
              <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-3)' }}>
                <div className="avatar" style={{ background: user.role === ROLES.SENIOR ? 'var(--color-primary)' : '#27AE60' }}>
                  {user.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{user.name}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                    {roleLabel(user.role)} · Age {user.age}
                  </div>
                </div>
                <span className="badge badge-kyc-pending"> Pending</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                <div> {user.phone}</div>
                <div> {user.area} · {user.pincode}</div>
                <div> {user.kyc.documentType} ****{user.kyc.aadhaarLast4}</div>
                <div> Submitted {formatDateTime(user.submittedOn)}</div>
                {user.notes && <div> {user.notes}</div>}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => setSelectedUser(user)}
                >
                  View Details
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => handleReject(user.id)}
                  disabled={!!processing}
                >
                  {processing === user.id ? '…' : 'Reject'}
                </button>
                <button
                  className="btn btn-success btn-sm"
                  style={{ flex: 2 }}
                  onClick={() => handleApprove(user.id)}
                  disabled={!!processing}
                >
                  {processing === user.id ? 'Processing…' : '✓ Approve'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <Modal isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} title="Profile Details">
        {selectedUser && (
          <div>
            <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-5)' }}>
              <div className="avatar avatar-lg">{selectedUser.name[0]}</div>
              <div>
                <h3>{selectedUser.name}</h3>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{roleLabel(selectedUser.role)}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
              {[
                { label: 'Phone', value: selectedUser.phone },
                { label: 'Age', value: selectedUser.age },
                { label: 'Area', value: `${selectedUser.area}, ${selectedUser.pincode}` },
                { label: 'Document', value: `${selectedUser.kyc.documentType} ****${selectedUser.kyc.aadhaarLast4}` },
                { label: 'Submitted', value: formatDateTime(selectedUser.submittedOn) },
                { label: 'Notes', value: selectedUser.notes || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>{label}</span>
                  <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handleReject(selectedUser.id)}>
                Reject
              </button>
              <button className="btn btn-success" style={{ flex: 2 }} onClick={() => handleApprove(selectedUser.id)}>
                ✓ Approve Member
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
