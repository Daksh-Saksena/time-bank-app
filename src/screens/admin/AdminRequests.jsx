import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { URGENCY, REQUEST_STATUS, SERVICE_LABELS, SERVICE_ICONS } from '../../data/mockData';
import RequestCard from '../../components/common/RequestCard';
export default function AdminRequests() {
  const { requests } = useApp();
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const filtered = requests.filter((r) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterUrgency !== 'all' && r.urgency !== filterUrgency) return false;
    return true;
  });
  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <h2 className="page-title">All Requests</h2>
            <p className="page-subtitle">{requests.length} requests in 400001</p>
          </div>
        </div>
      </div>
      <div className="filter-pills">
        <button className={`filter-pill${filterStatus === 'all' ? ' active' : ''}`} onClick={() => setFilterStatus('all')}>All</button>
        <button className={`filter-pill${filterStatus === REQUEST_STATUS.OPEN ? ' active' : ''}`} onClick={() => setFilterStatus(REQUEST_STATUS.OPEN)}>Open</button>
        <button className={`filter-pill${filterStatus === REQUEST_STATUS.IN_PROGRESS ? ' active' : ''}`} onClick={() => setFilterStatus(REQUEST_STATUS.IN_PROGRESS)}>In Progress</button>
        <button className={`filter-pill${filterStatus === REQUEST_STATUS.COMPLETED ? ' active' : ''}`} onClick={() => setFilterStatus(REQUEST_STATUS.COMPLETED)}>Completed</button>
        <button className={`filter-pill${filterUrgency === URGENCY.HIGH ? ' active' : ''}`} onClick={() => setFilterUrgency(filterUrgency === URGENCY.HIGH ? 'all' : URGENCY.HIGH)}> Urgent</button>
      </div>
      <div style={{ padding: '0 var(--space-5)' }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"></div>
            <p>No requests match your filters.</p>
          </div>
        ) : (
          filtered.map((req) => (
            <RequestCard key={req.id} request={req} />
          ))
        )}
      </div>
    </div>
  );
}
