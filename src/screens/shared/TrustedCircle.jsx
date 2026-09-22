import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { ROLES, MAX_PREFERRED_CIRCLE } from '../../constants';
import { UserPlus, UserMinus, Star, Search, HeartHandshake } from 'lucide-react';

export default function TrustedCircle({ forRole }) {
  const { currentUser, members, addToTrustedCircle, removeFromTrustedCircle, getTrustedCircle } = useApp();
  const [circle, setCircle] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [toast, setToast] = useState('');

  const isVolunteer = forRole === ROLES.VOLUNTEER || currentUser?.role === ROLES.VOLUNTEER;
  // Senior sees volunteers, volunteer sees seniors
  const targetRole = isVolunteer ? ROLES.SENIOR : ROLES.VOLUNTEER;

  const loadCircle = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTrustedCircle();
      setCircle(data);
    } finally {
      setLoading(false);
    }
  }, [getTrustedCircle]);

  useEffect(() => { loadCircle(); }, [loadCircle]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  const circleIds = new Set(circle.map((c) => c.id));

  const availableToAdd = members.filter(
    (m) => m.role === targetRole &&
      m.id !== currentUser?.id &&
      !circleIds.has(m.id) &&
      m.kyc_status === 'verified' &&
      (!searchQuery || m.name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  async function handleAdd(member) {
    if (circle.length >= MAX_PREFERRED_CIRCLE) {
      showToast(`You can add up to ${MAX_PREFERRED_CIRCLE} members to your Trusted Circle.`);
      return;
    }
    setActionId(member.id);
    await addToTrustedCircle(member);
    setCircle((prev) => [...prev, member]);
    showToast(`${member.name} added to your Trusted Circle!`);
    setActionId(null);
  }

  async function handleRemove(member) {
    setActionId(member.id);
    await removeFromTrustedCircle(member.id);
    setCircle((prev) => prev.filter((c) => c.id !== member.id));
    showToast(`${member.name} removed from Trusted Circle.`);
    setActionId(null);
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <h2 className="page-title">Trusted Circle</h2>
            <p className="page-subtitle">{circle.length} / {MAX_PREFERRED_CIRCLE} added</p>
          </div>
        </div>
      </div>

      {toast && (
        <div style={{ margin: 'var(--space-2) var(--space-5)', padding: 'var(--space-3)', background: 'var(--color-primary)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', fontWeight: 600, textAlign: 'center', animation: 'fadeIn 0.2s ease' }}>
          {toast}
        </div>
      )}

      <div style={{ padding: '0 var(--space-5) var(--space-5)' }}>
        {/* Current Circle */}
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <h4 style={{ marginBottom: 'var(--space-3)' }}>Your Trusted {isVolunteer ? 'Seniors' : 'Volunteers'}</h4>
          {loading ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Loading…</p>
          ) : circle.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-6) 0' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <HeartHandshake size={36} color="var(--color-text-muted)" />
              </div>
              <p style={{ fontSize: 'var(--font-size-sm)' }}>
                No {isVolunteer ? 'seniors' : 'volunteers'} in your Trusted Circle yet.
                <br />Add people you trust below.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {circle.map((member) => (
                <div key={member.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="avatar" style={{ background: isVolunteer ? 'var(--color-primary)' : '#27AE60' }}>
                    {member.name?.[0] || 'U'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>{member.name}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      {member.area || 'Local Area'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(member)}
                    disabled={actionId === member.id}
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <UserMinus size={14} /> Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add more members */}
        {circle.length < MAX_PREFERRED_CIRCLE && (
          <div>
            <h4 style={{ marginBottom: 'var(--space-3)' }}>Add to Trusted Circle</h4>
            <div style={{ position: 'relative', marginBottom: 'var(--space-3)' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input
                type="text"
                className="input"
                placeholder="Search by name…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 36, fontSize: 'var(--font-size-sm)' }}
              />
            </div>

            {availableToAdd.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
                {searchQuery ? 'No matching members found.' : 'All available members are in your circle.'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {availableToAdd.slice(0, 5).map((member) => (
                  <div key={member.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'var(--space-3)' }}>
                    <div className="avatar avatar-sm" style={{ background: isVolunteer ? 'var(--color-primary)' : '#27AE60' }}>
                      {member.name?.[0] || 'U'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{member.name}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        {member.area || 'Local Area'}
                        {member.rating && ` · ${member.rating.toFixed(1)} ★`}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAdd(member)}
                      disabled={actionId === member.id}
                      style={{ background: 'var(--color-primary)', border: 'none', color: 'white', borderRadius: 'var(--radius-md)', padding: '6px 12px', cursor: 'pointer', fontFamily: 'var(--font-family)', fontWeight: 600, fontSize: 'var(--font-size-xs)', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <UserPlus size={14} /> Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 'var(--space-5)', padding: 'var(--space-4)', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
          <strong>How it works:</strong> When you create a request, your Trusted Circle gets notified first. If no one responds in 15 minutes, the request is shared with all volunteers.
        </div>
      </div>
    </div>
  );
}
