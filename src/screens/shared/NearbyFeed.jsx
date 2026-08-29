import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import RequestCard from '../../components/common/RequestCard';
import {
  SERVICE_ICONS, URGENCY, REQUEST_STATUS, SERVICE_LABELS, getDistanceLabel,
} from '../../constants';
import { List, MapPin } from 'lucide-react';
import RealMap from '../../components/common/RealMap';

const ALL_TYPES = 'all';
export default function NearbyFeed({ role = 'senior' }) {
  const { getOpenRequests, getUserRequests, currentUser, acceptRequest, requests } = useApp();
  const [view, setView] = useState('list');
  const [filterUrgency, setFilterUrgency] = useState(ALL_TYPES);
  const [filterType, setFilterType] = useState(ALL_TYPES);
  const displayRequests = role === 'volunteer'
    ? getOpenRequests()
    : getUserRequests();
  const filtered = displayRequests.filter((r) => {
    if (filterUrgency !== ALL_TYPES && r.urgency !== filterUrgency) return false;
    if (filterType !== ALL_TYPES && r.serviceType !== filterType) return false;
    return true;
  });
  function handleAccept(req) {
    acceptRequest(req.id);
  }
  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <h2 className="page-title">{role === 'volunteer' ? 'Nearby Requests' : 'My Requests'}</h2>
            <p className="page-subtitle">
              {currentUser?.pincode ? `Pincode ${currentUser.pincode}` : 'Local Area'}
              {currentUser?.area ? ` · ${currentUser.area}` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setView('list')}
              aria-pressed={view === 'list'}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <List size={15} />
              <span>List</span>
            </button>
            <button
              className={`btn btn-sm ${view === 'map' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setView('map')}
              aria-pressed={view === 'map'}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <MapPin size={15} />
              <span>Map</span>
            </button>
          </div>
        </div>
      </div>
      {view === 'map' && (
        <div style={{ padding: 'var(--space-4) var(--space-5) 0' }}>
          <RealMap
            requests={filtered}
            onAccept={handleAccept}
            role={role}
          />
          <div style={{ display: 'flex', gap: 'var(--space-3)', margin: 'var(--space-3) 0', fontSize: 'var(--font-size-xs)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--color-danger)', display: 'inline-block' }} />Urgent
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--color-primary)', display: 'inline-block' }} />Normal
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#2E86AB', border: '2px solid white', display: 'inline-block' }} />You ({currentUser?.area || 'Your Location'})
            </span>
          </div>
        </div>
      )}
      <div className="filter-pills">
        <button className={`filter-pill${filterUrgency === ALL_TYPES ? ' active' : ''}`} onClick={() => setFilterUrgency(ALL_TYPES)}>All</button>
        <button className={`filter-pill${filterUrgency === URGENCY.HIGH ? ' active' : ''}`} onClick={() => setFilterUrgency(URGENCY.HIGH)}> Urgent</button>
        <button className={`filter-pill${filterUrgency === URGENCY.NORMAL ? ' active' : ''}`} onClick={() => setFilterUrgency(URGENCY.NORMAL)}> Normal</button>
        <button className={`filter-pill${filterType === 'medicine' ? ' active' : ''}`} onClick={() => setFilterType(filterType === 'medicine' ? ALL_TYPES : 'medicine')}> Medicine</button>
        <button className={`filter-pill${filterType === 'groceries' ? ' active' : ''}`} onClick={() => setFilterType(filterType === 'groceries' ? ALL_TYPES : 'groceries')}> Groceries</button>
        <button className={`filter-pill${filterType === 'bank' ? ' active' : ''}`} onClick={() => setFilterType(filterType === 'bank' ? ALL_TYPES : 'bank')}> Bank</button>
        <button className={`filter-pill${filterType === 'walk' ? ' active' : ''}`} onClick={() => setFilterType(filterType === 'walk' ? ALL_TYPES : 'walk')}> Walk</button>
      </div>
      <div style={{ padding: '0 var(--space-5)' }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"></div>
            <p>No requests match your filters.</p>
          </div>
        ) : (
          filtered.map((req, idx) => (
            <RequestCard
              key={req.id}
              request={req}
              onAccept={role === 'volunteer' ? handleAccept : undefined}
              showDistance={role === 'volunteer'}
              distance={getDistanceLabel(idx)}
            />
          ))
        )}
      </div>
    </div>
  );
}
