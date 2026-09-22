import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { SERVICE_TYPES, SERVICE_LABELS, SERVICE_ICONS, URGENCY, ROLES } from '../../constants';
import { ArrowLeft, Check, ShieldCheck, Clock, Calendar, AlertCircle } from 'lucide-react';
import { getPincodeLocation } from '../../lib/geo';

export default function AdminCreateRequest() {
  const { currentUser, isSuperAdmin, createRequest, members } = useApp();
  const navigate = useNavigate();

  const [selectedMember, setSelectedMember] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({
    serviceType: SERVICE_TYPES.MEDICINE,
    description: '',
    urgency: URGENCY.NORMAL,
    location: '',
    pincode: currentUser?.pincode || '400001',
    scheduledDate: 'Today',
    scheduledTime: '16:00',
    estimatedDuration: 30,
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filter seniors in admin's pincode (or all if super admin)
  const availableSeniors = members.filter(
    (m) => (m.role === ROLES.SENIOR || (m.roles || []).includes(ROLES.SENIOR)) &&
      (isSuperAdmin || !currentUser?.pincode || m.pincode === currentUser.pincode)
  );

  const filteredSeniors = availableSeniors.filter(
    (m) =>
      !searchQuery ||
      m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone?.includes(searchQuery) ||
      m.area?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedMember) {
      setError('Please select a senior member from the list.');
      return;
    }
    if (!form.description.trim()) {
      setError('Please describe the assistance needed.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await createRequest({
        seniorId: selectedMember.id,
        seniorName: selectedMember.name,
        serviceType: form.serviceType,
        description: form.description.trim(),
        location: form.location || selectedMember.area || 'Local Area',
        pincode: selectedMember.pincode || currentUser?.pincode || '400001',
        urgency: form.urgency,
        scheduledDate: form.scheduledDate,
        scheduledTime: form.scheduledTime,
        estimatedDuration: parseInt(form.estimatedDuration || 30, 10),
        createdByAdminId: currentUser?.id || 'admin',
        createdByAdminName: currentUser?.name || 'Pincode Admin',
      });

      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to create request. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="page-content no-nav" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 'var(--space-6)' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#16A34A', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)', boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)' }}>
            <Check size={42} />
          </div>
          <h2 style={{ marginBottom: 'var(--space-2)', fontWeight: 800 }}>Request Created Successfully!</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Created on behalf of <strong>{selectedMember?.name}</strong>
          </p>

          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: 'var(--space-5)', textAlign: 'left', fontSize: 'var(--font-size-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#1E40AF', marginBottom: 4 }}>
              <ShieldCheck size={16} color="#2563EB" />
              <span>Official Admin Record</span>
            </div>
            <div style={{ color: '#1E3A8A' }}>
              Tagged: "Created by Admin <strong>{currentUser?.name || 'Admin'}</strong> on behalf of {selectedMember?.name}"
            </div>
          </div>

          <button className="btn btn-primary btn-full btn-lg" onClick={() => navigate('/admin/requests')}>
            View in Request Lifecycle
          </button>
          <button
            className="btn btn-ghost btn-full"
            style={{ marginTop: 'var(--space-3)' }}
            onClick={() => {
              setSubmitted(false);
              setSelectedMember(null);
              setForm({
                serviceType: SERVICE_TYPES.MEDICINE,
                description: '',
                urgency: URGENCY.NORMAL,
                location: '',
                pincode: currentUser?.pincode || '400001',
                scheduledDate: 'Today',
                scheduledTime: '16:00',
                estimatedDuration: 30,
              });
            }}
          >
            + Create Another Request
          </button>
        </div>
      </div>
    );
  }

  const adminGeo = getPincodeLocation(currentUser?.pincode, currentUser?.area);

  return (
    <div className="page-content no-nav">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1A365D 0%, #2563EB 100%)', padding: 'var(--space-5)' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-3)' }}
        >
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ color: 'white', fontWeight: 800, marginBottom: 2 }}>Create Request for Member</h2>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 'var(--font-size-sm)' }}>
          {isSuperAdmin
            ? 'Super Admin Mode · Cross-Pincode Creation'
            : `Pincode ${currentUser?.pincode || '400001'} · ${adminGeo.full}`}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: 'var(--space-5)' }}>
        {/* Step 1: Select Member */}
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <h4 style={{ marginBottom: 'var(--space-2)', fontWeight: 800 }}>1. Select Senior Member</h4>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
            Choose a senior from {isSuperAdmin ? 'all registered members' : `Pincode ${currentUser?.pincode || '400001'}`}
          </p>
          <input
            className="input"
            placeholder="Search member by name, phone or area…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ marginBottom: 'var(--space-3)' }}
          />

          <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            {filteredSeniors.length === 0 ? (
              <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                No senior members found
              </div>
            ) : (
              filteredSeniors.map((m) => {
                const isSelected = selectedMember?.id === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedMember(m);
                      if (!form.location) {
                        setForm((prev) => ({ ...prev, location: m.area || '' }));
                      }
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 'var(--space-3) var(--space-4)',
                      background: isSelected ? '#EFF6FF' : 'white',
                      border: 'none',
                      borderBottom: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-family)',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isSelected ? 'white' : 'var(--color-text-muted)',
                        fontWeight: 700,
                        fontSize: 'var(--font-size-sm)',
                        flexShrink: 0,
                      }}
                    >
                      {m.name?.[0] || 'S'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: isSelected ? 800 : 600, fontSize: 'var(--font-size-sm)', color: isSelected ? 'var(--color-primary)' : 'inherit' }}>
                        {m.name}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        {m.area || 'Local Area'} · {m.phone || 'No phone'} · Age {m.age || 70}
                      </div>
                    </div>
                    {isSelected && <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>✓ Selected</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {selectedMember && (
          <>
            <div className="alert alert-info" style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={18} color="#2563EB" />
              <span>
                Creating on behalf of <strong>{selectedMember.name}</strong> ({selectedMember.area || 'Local Area'})
              </span>
            </div>

            {/* Step 2: Service Type */}
            <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="input-label" style={{ fontWeight: 700 }}>2. Type of Help Needed</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                {Object.values(SERVICE_TYPES).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => updateForm('serviceType', type)}
                    style={{
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${form.serviceType === type ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: form.serviceType === type ? '#EFF6FF' : 'white',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-family)',
                      fontWeight: 600,
                      fontSize: 'var(--font-size-sm)',
                      color: form.serviceType === type ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      minHeight: 48,
                    }}
                  >
                    <span>{SERVICE_ICONS[type]}</span>
                    <span>{SERVICE_LABELS[type]?.split(' ')[0] || type}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Description */}
            <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="input-label" style={{ fontWeight: 700 }}>3. Describe the Help Needed</label>
              <textarea
                className="input"
                placeholder="e.g. Senior requires assistance fetching hypertension medicine from chemist, or accompaniment to clinic…"
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                rows={3}
                required
              />
            </div>

            {/* Step 4: Scheduling & Duration */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div className="input-group">
                <label className="input-label" style={{ fontWeight: 700 }}>
                  <Calendar size={14} style={{ display: 'inline', marginRight: 4 }} />
                  Date
                </label>
                <select
                  className="input"
                  value={form.scheduledDate}
                  onChange={(e) => updateForm('scheduledDate', e.target.value)}
                >
                  <option value="Today">Today (आज)</option>
                  <option value="Tomorrow">Tomorrow (कल)</option>
                  <option value="This Weekend">This Weekend</option>
                  <option value="Next Week">Next Week</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label" style={{ fontWeight: 700 }}>
                  <Clock size={14} style={{ display: 'inline', marginRight: 4 }} />
                  Time & Est.
                </label>
                <select
                  className="input"
                  value={form.estimatedDuration}
                  onChange={(e) => updateForm('estimatedDuration', e.target.value)}
                >
                  <option value={30}>~30 mins</option>
                  <option value={45}>~45 mins</option>
                  <option value={60}>~1 hour (60m)</option>
                  <option value={90}>~1.5 hours (90m)</option>
                  <option value={120}>~2 hours (120m)</option>
                </select>
              </div>
            </div>

            {/* Step 5: Urgency */}
            <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="input-label" style={{ fontWeight: 700 }}>5. Urgency</label>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                {[
                  { value: URGENCY.NORMAL, label: 'Normal', desc: 'Flexible timing' },
                  { value: URGENCY.HIGH, label: 'High Priority', desc: 'Urgent / immediate' },
                ].map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateForm('urgency', value)}
                    style={{
                      flex: 1,
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${form.urgency === value ? (value === URGENCY.HIGH ? 'var(--color-danger)' : 'var(--color-success)') : 'var(--color-border)'}`,
                      background: form.urgency === value ? (value === URGENCY.HIGH ? 'var(--color-danger-bg)' : 'var(--color-success-bg)') : 'white',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-family)',
                      fontWeight: 700,
                      fontSize: 'var(--font-size-sm)',
                      minHeight: 56,
                    }}
                  >
                    <div>{label}</div>
                    <div style={{ fontWeight: 400, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 6: Location */}
            <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="input-label" style={{ fontWeight: 700 }}>6. Location / Landmark</label>
              <input
                className="input"
                placeholder={selectedMember.area || 'e.g. Near Post Office / Apartment #'}
                value={form.location}
                onChange={(e) => updateForm('location', e.target.value)}
              />
            </div>

            {error && (
              <div className="alert alert-warning" style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={16} color="#D97706" />
                <span>{error}</span>
              </div>
            )}

            <button
              className="btn btn-primary btn-full btn-lg"
              type="submit"
              disabled={loading || !form.description.trim()}
              style={{ minHeight: 56, fontWeight: 800, fontSize: '1.05rem', borderRadius: 'var(--radius-lg)' }}
            >
              {loading ? 'Creating Request…' : 'Create Request on Behalf of Member'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
