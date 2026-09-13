import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { URGENCY, REQUEST_STATUS, SERVICE_LABELS, SERVICE_ICONS, formatMinutes } from '../../constants';
import RequestCard from '../../components/common/RequestCard';
import Modal from '../../components/common/Modal';

export default function AdminRequests() {
  const { requests, currentUser, members, cancelRequest, reassignRequest } = useApp();
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [selectedReq, setSelectedReq] = useState(null);
  const [reassignVolunteerId, setReassignVolunteerId] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const volunteers = (members || []).filter(
    (m) => m.role === 'volunteer' && m.kyc_status === 'verified' && !m.is_blocked
  );

  const filtered = requests.filter((r) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterUrgency !== 'all' && r.urgency !== filterUrgency) return false;
    return true;
  });

  const handleCancel = async () => {
    if (!selectedReq) return;
    if (!window.confirm('Are you sure you want to cancel this request?')) return;
    setLoadingAction(true);
    try {
      await cancelRequest(selectedReq.id);
      setActionMsg('Request cancelled successfully');
      setTimeout(() => {
        setSelectedReq(null);
        setActionMsg('');
      }, 1200);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleReassign = async () => {
    if (!selectedReq || !reassignVolunteerId) return;
    setLoadingAction(true);
    try {
      const vol = volunteers.find((v) => v.id === reassignVolunteerId);
      await reassignRequest(selectedReq.id, vol?.id, vol?.name);
      setActionMsg(`Reassigned to ${vol?.name || 'volunteer'}`);
      setTimeout(() => {
        setSelectedReq(null);
        setActionMsg('');
        setReassignVolunteerId('');
      }, 1200);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <h2 className="page-title">All Requests</h2>
            <p className="page-subtitle">{requests.length} requests in {currentUser?.pincode || 'your area'}</p>
          </div>
        </div>
      </div>

      <div className="filter-pills">
        <button className={`filter-pill${filterStatus === 'all' ? ' active' : ''}`} onClick={() => setFilterStatus('all')}>All</button>
        <button className={`filter-pill${filterStatus === REQUEST_STATUS.OPEN ? ' active' : ''}`} onClick={() => setFilterStatus(REQUEST_STATUS.OPEN)}>Open</button>
        <button className={`filter-pill${filterStatus === REQUEST_STATUS.IN_PROGRESS ? ' active' : ''}`} onClick={() => setFilterStatus(REQUEST_STATUS.IN_PROGRESS)}>In Progress</button>
        <button className={`filter-pill${filterStatus === REQUEST_STATUS.COMPLETED ? ' active' : ''}`} onClick={() => setFilterStatus(REQUEST_STATUS.COMPLETED)}>Completed</button>
        <button className={`filter-pill${filterUrgency === URGENCY.HIGH ? ' active' : ''}`} onClick={() => setFilterUrgency(filterUrgency === URGENCY.HIGH ? 'all' : URGENCY.HIGH)}>Urgent</button>
      </div>

      <div style={{ padding: '0 var(--space-5)' }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p>No requests match your filters.</p>
          </div>
        ) : (
          filtered.map((req) => (
            <div
              key={req.id}
              onClick={() => { setSelectedReq(req); setActionMsg(''); setReassignVolunteerId(''); }}
              style={{ cursor: 'pointer' }}
            >
              <RequestCard request={req} />
            </div>
          ))
        )}
      </div>

      {/* Admin Request Action Modal */}
      <Modal
        isOpen={Boolean(selectedReq)}
        onClose={() => setSelectedReq(null)}
        center
        title="Manage Request"
      >
        {selectedReq && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--space-3)' }}>
              <span style={{ fontSize: '2rem' }}>{SERVICE_ICONS[selectedReq.serviceType]}</span>
              <div>
                <h4 style={{ margin: 0 }}>{SERVICE_LABELS[selectedReq.serviceType]}</h4>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  By {selectedReq.seniorName} • {selectedReq.location}
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--color-surface-secondary, #f8f9fa)', padding: 12, borderRadius: 8, fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>
              <p style={{ margin: '0 0 6px' }}><strong>Description:</strong> {selectedReq.description || 'No description provided.'}</p>
              <p style={{ margin: '0 0 6px' }}><strong>Status:</strong> <span style={{ textTransform: 'capitalize' }}>{selectedReq.status}</span></p>
              <p style={{ margin: '0 0 6px' }}><strong>Assigned to:</strong> {selectedReq.assignedVolunteerName || selectedReq.assigned_volunteer_name || 'None (Open)'}</p>
              {selectedReq.duration && <p style={{ margin: 0 }}><strong>Duration:</strong> {formatMinutes(selectedReq.duration)}</p>}
            </div>

            {actionMsg && (
              <div style={{ padding: 10, background: '#E8F8F0', color: '#27AE60', borderRadius: 8, marginBottom: 12, fontWeight: 600, fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>
                {actionMsg}
              </div>
            )}

            {/* Reassign Volunteer */}
            {selectedReq.status !== REQUEST_STATUS.COMPLETED && selectedReq.status !== REQUEST_STATUS.CANCELLED && (
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600, marginBottom: 6 }}>
                  Reassign to Volunteer:
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    className="input"
                    style={{ flex: 1 }}
                    value={reassignVolunteerId}
                    onChange={(e) => setReassignVolunteerId(e.target.value)}
                  >
                    <option value="">Select verified volunteer...</option>
                    {volunteers.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.area || v.pincode || 'Area'})
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={!reassignVolunteerId || loadingAction}
                    onClick={handleReassign}
                  >
                    Assign
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              {selectedReq.status !== REQUEST_STATUS.COMPLETED && selectedReq.status !== REQUEST_STATUS.CANCELLED && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleCancel}
                  disabled={loadingAction}
                >
                  Cancel Request
                </button>
              )}
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setSelectedReq(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

