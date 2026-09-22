import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { URGENCY, REQUEST_STATUS, SERVICE_LABELS, SERVICE_ICONS, formatMinutes, SERVICE_TYPES } from '../../constants';
import RequestCard from '../../components/common/RequestCard';
import Modal from '../../components/common/Modal';
import { ShieldCheck, UserCheck, AlertCircle, Edit3, XCircle, CheckCircle, Plus } from 'lucide-react';
import { getPincodeLocation } from '../../lib/geo';

const LIFECYCLE_TABS = [
  { key: 'all', label: 'All' },
  { key: 'created', label: 'Created' },
  { key: 'notified_trusted', label: 'Notified to Trusted' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'rated', label: 'Rated' },
  { key: 'closed', label: 'Closed' },
  { key: 'cancelled', label: 'Cancelled' },
];

function matchesLifecycle(req, tabKey) {
  if (tabKey === 'all') return true;
  const status = req.status;
  const lifecycle = req.lifecycleStatus || req.lifecycle_status;

  if (tabKey === 'created') {
    return status === REQUEST_STATUS.OPEN && (lifecycle === 'created' || !lifecycle);
  }
  if (tabKey === 'notified_trusted') {
    return status === REQUEST_STATUS.NOTIFIED_TRUSTED || lifecycle === 'notified_trusted';
  }
  if (tabKey === 'accepted') {
    return status === REQUEST_STATUS.ACCEPTED || lifecycle === 'accepted';
  }
  if (tabKey === 'in_progress') {
    return status === REQUEST_STATUS.IN_PROGRESS || lifecycle === 'in_progress';
  }
  if (tabKey === 'completed') {
    return status === REQUEST_STATUS.COMPLETED || lifecycle === 'completed';
  }
  if (tabKey === 'rated') {
    return status === REQUEST_STATUS.RATED || lifecycle === 'rated';
  }
  if (tabKey === 'closed') {
    return status === REQUEST_STATUS.CLOSED || lifecycle === 'closed';
  }
  if (tabKey === 'cancelled') {
    return status === REQUEST_STATUS.CANCELLED || lifecycle === 'cancelled';
  }
  return false;
}

export default function AdminRequests() {
  const { requests, currentUser, isSuperAdmin, members, cancelRequest, reassignRequest, editRequest } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [selectedReq, setSelectedReq] = useState(null);
  const [reassignVolunteerId, setReassignVolunteerId] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [loadingAction, setLoadingAction] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  // Scoping: Pincode Admin manages their assigned pincode, Super Admin manages all
  const scopedRequests = isSuperAdmin || !currentUser?.pincode
    ? requests
    : requests.filter((r) => r.pincode === currentUser.pincode);

  const volunteers = (members || []).filter(
    (m) =>
      (m.role === 'volunteer' || (m.roles || []).includes('volunteer')) &&
      m.kyc_status === 'verified' &&
      !m.is_blocked &&
      (isSuperAdmin || !currentUser?.pincode || m.pincode === currentUser.pincode)
  );

  const filtered = scopedRequests.filter((r) => {
    if (!matchesLifecycle(r, activeTab)) return false;
    if (filterUrgency !== 'all' && r.urgency !== filterUrgency) return false;
    return true;
  });

  const handleOpenModal = (req) => {
    setSelectedReq(req);
    setActionMsg('');
    setReassignVolunteerId(req.assignedVolunteerId || '');
    setIsEditing(false);
    setEditForm({
      description: req.description || '',
      serviceType: req.serviceType || 'medicine',
      urgency: req.urgency || URGENCY.NORMAL,
      location: req.location || '',
      scheduledDate: req.scheduledDate || 'Today',
      scheduledTime: req.scheduledTime || '',
    });
  };

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
      }, 1000);
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
      }, 1000);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;
    setLoadingAction(true);
    try {
      await editRequest(selectedReq.id, editForm);
      setActionMsg('Request details updated');
      setIsEditing(false);
      setTimeout(() => {
        setActionMsg('');
        setSelectedReq((prev) => (prev ? { ...prev, ...editForm } : prev));
      }, 1000);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAction(false);
    }
  };

  const currentGeo = getPincodeLocation(currentUser?.pincode, currentUser?.area);

  return (
    <div className="page-content">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-inner flex justify-between items-center">
          <div>
            <h2 className="page-title">Request Lifecycle</h2>
            <p className="page-subtitle">
              {isSuperAdmin
                ? `Super Admin · ${scopedRequests.length} requests across all pincodes`
                : `Pincode ${currentUser?.pincode || '400001'} (${currentGeo.full}) · ${scopedRequests.length} requests`}
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/create-request')}
            className="btn btn-primary btn-sm"
            style={{ fontWeight: 800, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={16} /> <span>Create Request</span>
          </button>
        </div>
      </div>

      {/* Lifecycle Stage Filter Pills with exact counts */}
      <div className="filter-pills" style={{ overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: 8, gap: 6 }}>
        {LIFECYCLE_TABS.map(({ key, label }) => {
          const count = scopedRequests.filter((r) => matchesLifecycle(r, key)).length;
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              className={`filter-pill${isActive ? ' active' : ''}`}
              onClick={() => setActiveTab(key)}
              style={{ fontWeight: isActive ? 800 : 600, fontSize: '0.82rem' }}
            >
              {label} ({count})
            </button>
          );
        })}
        <button
          className={`filter-pill${filterUrgency === URGENCY.HIGH ? ' active' : ''}`}
          style={{ marginLeft: 8, borderColor: '#DC2626', color: filterUrgency === URGENCY.HIGH ? 'white' : '#DC2626', background: filterUrgency === URGENCY.HIGH ? '#DC2626' : 'white' }}
          onClick={() => setFilterUrgency(filterUrgency === URGENCY.HIGH ? 'all' : URGENCY.HIGH)}
        >
          🚨 Urgent Only
        </button>
      </div>

      {/* Requests Feed */}
      <div style={{ padding: '0 var(--space-5)' }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>No requests found</h3>
            <p>No requests match the selected lifecycle stage or filters.</p>
          </div>
        ) : (
          filtered.map((req) => (
            <div
              key={req.id}
              onClick={() => handleOpenModal(req)}
              style={{ cursor: 'pointer' }}
            >
              <RequestCard request={req} />
            </div>
          ))
        )}
      </div>

      {/* Admin Request Management Modal */}
      <Modal
        isOpen={Boolean(selectedReq)}
        onClose={() => setSelectedReq(null)}
        center
        title="Manage Request"
      >
        {selectedReq && (
          <div>
            {/* Header info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--space-3)' }}>
              <span style={{ fontSize: '2rem' }}>{SERVICE_ICONS[selectedReq.serviceType] || '🤝'}</span>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0, fontWeight: 800 }}>{SERVICE_LABELS[selectedReq.serviceType] || selectedReq.serviceType}</h4>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  Senior: <strong>{selectedReq.seniorName}</strong> · {selectedReq.location}
                </div>
              </div>
            </div>

            {/* Created on behalf badge */}
            {(selectedReq.createdByAdminName || selectedReq.created_by_admin_name) && (
              <div style={{ marginBottom: 12, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--font-size-xs)', color: '#1E40AF', fontWeight: 600 }}>
                <ShieldCheck size={16} color="#2563EB" />
                <span>Created by Admin <strong>{selectedReq.createdByAdminName || selectedReq.created_by_admin_name}</strong> on behalf of {selectedReq.seniorName}</span>
              </div>
            )}

            {actionMsg && (
              <div style={{ padding: 10, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#16A34A', borderRadius: 8, marginBottom: 12, fontWeight: 700, fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>
                {actionMsg}
              </div>
            )}

            {!isEditing ? (
              <>
                <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)', border: '1px solid var(--color-border)' }}>
                  <p style={{ margin: '0 0 6px' }}><strong>Description:</strong> {selectedReq.description || 'No description provided.'}</p>
                  <p style={{ margin: '0 0 6px' }}><strong>Lifecycle Status:</strong> <span style={{ textTransform: 'capitalize', fontWeight: 700, color: 'var(--color-primary)' }}>{selectedReq.lifecycleStatus || selectedReq.status}</span></p>
                  <p style={{ margin: '0 0 6px' }}><strong>Urgency:</strong> {selectedReq.urgency === URGENCY.HIGH ? '🔴 High Priority' : '🟢 Normal'}</p>
                  <p style={{ margin: '0 0 6px' }}><strong>Assigned Volunteer:</strong> {selectedReq.assignedVolunteerName || selectedReq.assigned_volunteer_name || 'None (Open / Not Assigned)'}</p>
                  <p style={{ margin: '0 0 6px' }}><strong>Schedule:</strong> {selectedReq.scheduledDate || 'Today'} {selectedReq.scheduledTime ? `at ${selectedReq.scheduledTime}` : ''}</p>
                  {selectedReq.duration && <p style={{ margin: 0 }}><strong>Duration:</strong> {formatMinutes(selectedReq.duration)}</p>}
                </div>

                {/* Reassign Volunteer */}
                {selectedReq.status !== REQUEST_STATUS.COMPLETED && selectedReq.status !== REQUEST_STATUS.CANCELLED && selectedReq.status !== REQUEST_STATUS.CLOSED && (
                  <div style={{ marginBottom: 'var(--space-4)', background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid var(--color-border)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', fontWeight: 700, marginBottom: 8, color: 'var(--color-text-primary)' }}>
                      <UserCheck size={14} color="var(--color-primary)" />
                      Reassign to Volunteer ({volunteers.length} available):
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
                            {v.name} ({v.area || v.pincode})
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={!reassignVolunteerId || loadingAction}
                        onClick={handleReassign}
                        style={{ fontWeight: 800 }}
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                )}

                {/* Admin Actions Footer */}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 16 }}>
                  {selectedReq.status !== REQUEST_STATUS.COMPLETED && selectedReq.status !== REQUEST_STATUS.CANCELLED && selectedReq.status !== REQUEST_STATUS.CLOSED && (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setIsEditing(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}
                    >
                      <Edit3 size={14} /> Edit
                    </button>
                  )}
                  {selectedReq.status !== REQUEST_STATUS.COMPLETED && selectedReq.status !== REQUEST_STATUS.CANCELLED && selectedReq.status !== REQUEST_STATUS.CLOSED && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={handleCancel}
                      disabled={loadingAction}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}
                    >
                      <XCircle size={14} /> Cancel Request
                    </button>
                  )}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setSelectedReq(null)}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              /* Edit Request Form */
              <form onSubmit={handleSaveEdit}>
                <div className="input-group" style={{ marginBottom: 12 }}>
                  <label className="input-label" style={{ fontWeight: 700 }}>Help Description</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div className="input-group">
                    <label className="input-label" style={{ fontWeight: 700 }}>Service Category</label>
                    <select
                      className="input"
                      value={editForm.serviceType}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, serviceType: e.target.value }))}
                    >
                      {Object.values(SERVICE_TYPES).map((st) => (
                        <option key={st} value={st}>
                          {SERVICE_LABELS[st]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label" style={{ fontWeight: 700 }}>Urgency</label>
                    <select
                      className="input"
                      value={editForm.urgency}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, urgency: e.target.value }))}
                    >
                      <option value={URGENCY.NORMAL}>🟢 Normal</option>
                      <option value={URGENCY.HIGH}>🔴 High Priority</option>
                    </select>
                  </div>
                </div>

                <div className="input-group" style={{ marginBottom: 16 }}>
                  <label className="input-label" style={{ fontWeight: 700 }}>Location Landmark</label>
                  <input
                    className="input"
                    value={editForm.location}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setIsEditing(false)}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={loadingAction}
                    style={{ fontWeight: 800 }}
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
