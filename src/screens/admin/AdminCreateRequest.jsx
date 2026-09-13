import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { SERVICE_TYPES, SERVICE_LABELS, SERVICE_ICONS, URGENCY, ROLES } from '../../constants';
import { ArrowLeft, Check } from 'lucide-react';

export default function AdminCreateRequest() {
  const { currentUser, createRequest, members } = useApp();
  const navigate = useNavigate();

  const [selectedMember, setSelectedMember] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({
    serviceType: SERVICE_TYPES.MEDICINE,
    description: '',
    urgency: URGENCY.NORMAL,
    location: '',
    pincode: currentUser?.pincode || '',
    scheduledTime: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filter seniors in admin's pincode
  const pincodeSeniors = members.filter(
    (m) => m.role === ROLES.SENIOR && (!currentUser?.pincode || m.pincode === currentUser.pincode)
  );

  const filteredSeniors = pincodeSeniors.filter(
    (m) => !searchQuery || m.name?.toLowerCase().includes(searchQuery.toLowerCase()) || m.phone?.includes(searchQuery)
  );

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedMember) { setError('Please select a member.'); return; }
    if (!form.description) { setError('Please describe the help needed.'); return; }
    setError('');
    setLoading(true);
    try {
      // Use createRequest with admin overrides
      const { data: { user: authUser } } = await supabase.auth.getUser();

      const payload = {
        ...form,
        createdByAdminId: currentUser?.id,
        createdByAdminName: currentUser?.name,
      };

      // Insert directly as the senior's request
      const { error: insertError } = await supabase.from('requests').insert([{
        senior_id: selectedMember.id,
        senior_name: selectedMember.name,
        service_type: form.serviceType,
        description: form.description,
        location: form.location || selectedMember.area || 'Local Area',
        pincode: form.pincode || selectedMember.pincode || currentUser?.pincode || '400001',
        urgency: form.urgency,
        status: 'open',
        lifecycle_status: 'created',
        created_by_admin_id: currentUser?.id,
        created_by_admin_name: currentUser?.name,
      }]);

      if (insertError) throw insertError;
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
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'var(--color-success)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)' }}>
            <Check size={40} />
          </div>
          <h2 style={{ marginBottom: 'var(--space-3)' }}>Request Created!</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
            Request created on behalf of <strong>{selectedMember?.name}</strong>
          </p>
          <div className="alert alert-info" style={{ marginBottom: 'var(--space-5)', textAlign: 'left' }}>
            🛡️ Tagged: "Created by Admin {currentUser?.name} for {selectedMember?.name}"
          </div>
          <button className="btn btn-primary btn-full btn-lg" onClick={() => navigate('/admin/requests')}>
            View All Requests
          </button>
          <button className="btn btn-ghost btn-full" style={{ marginTop: 'var(--space-3)' }} onClick={() => { setSubmitted(false); setSelectedMember(null); setForm({ serviceType: SERVICE_TYPES.MEDICINE, description: '', urgency: URGENCY.NORMAL, location: '', pincode: currentUser?.pincode || '', scheduledTime: '' }); }}>
            Create Another Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content no-nav">
      <div style={{ background: 'var(--color-primary)', padding: 'var(--space-5)' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-3)' }}
        >
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ color: 'white', fontWeight: 700 }}>Create Request for Member</h2>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 'var(--font-size-sm)' }}>
          Creating on behalf of a senior in Pincode {currentUser?.pincode}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: 'var(--space-5)' }}>
        {/* Step 1: Select Member */}
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <h4 style={{ marginBottom: 'var(--space-3)' }}>1. Select Member</h4>
          <input
            className="input"
            placeholder="Search by name or phone…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ marginBottom: 'var(--space-3)' }}
          />
          <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            {filteredSeniors.length === 0 ? (
              <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                No seniors found in your pincode
              </div>
            ) : filteredSeniors.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMember(m)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: 'var(--space-3) var(--space-4)',
                  background: selectedMember?.id === m.id ? 'var(--color-surface-alt)' : 'white',
                  border: 'none', borderBottom: '1px solid var(--color-border)',
                  cursor: 'pointer', fontFamily: 'var(--font-family)', textAlign: 'left',
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: selectedMember?.id === m.id ? 'var(--color-primary)' : 'var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: selectedMember?.id === m.id ? 'white' : 'var(--color-text-muted)', fontWeight: 700, fontSize: 'var(--font-size-sm)', flexShrink: 0 }}>
                  {m.name?.[0] || 'M'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: selectedMember?.id === m.id ? 700 : 500, fontSize: 'var(--font-size-sm)' }}>{m.name}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{m.area} · {m.phone || 'No phone'}</div>
                </div>
                {selectedMember?.id === m.id && <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        {selectedMember && (
          <>
            <div className="alert alert-info" style={{ marginBottom: 'var(--space-4)' }}>
              🛡️ Creating request for <strong>{selectedMember.name}</strong> ({selectedMember.area})
            </div>

            {/* Service Type */}
            <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="input-label">2. Type of Help Needed</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                {Object.values(SERVICE_TYPES).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => updateForm('serviceType', type)}
                    style={{
                      padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                      border: `2px solid ${form.serviceType === type ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: form.serviceType === type ? '#EBF5FB' : 'white',
                      cursor: 'pointer', fontFamily: 'var(--font-family)', fontWeight: 600,
                      fontSize: 'var(--font-size-sm)',
                      color: form.serviceType === type ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      display: 'flex', alignItems: 'center', gap: 8, minHeight: 48,
                    }}
                  >
                    <span>{SERVICE_ICONS[type]}</span>
                    <span>{SERVICE_LABELS[type]?.split(' ')[0] || type}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="input-label">3. Describe the Help Needed</label>
              <textarea
                className="input"
                placeholder="e.g. Senior needs medicine from nearby pharmacy, Cipla tablet listed below…"
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                rows={3}
                required
              />
            </div>

            {/* Urgency */}
            <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="input-label">4. Urgency</label>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                {[
                  { value: URGENCY.NORMAL, label: 'Normal', desc: 'Flexible timing' },
                  { value: URGENCY.HIGH, label: '🚨 Urgent', desc: 'Need help ASAP' },
                ].map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateForm('urgency', value)}
                    style={{
                      flex: 1, padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                      border: `2px solid ${form.urgency === value ? (value === URGENCY.HIGH ? 'var(--color-danger)' : 'var(--color-success)') : 'var(--color-border)'}`,
                      background: form.urgency === value ? (value === URGENCY.HIGH ? 'var(--color-danger-bg)' : 'var(--color-success-bg)') : 'white',
                      cursor: 'pointer', fontFamily: 'var(--font-family)', fontWeight: 600, fontSize: 'var(--font-size-sm)', minHeight: 56,
                    }}
                  >
                    <div>{label}</div>
                    <div style={{ fontWeight: 400, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="input-label">5. Location / Landmark</label>
              <input
                className="input"
                placeholder={selectedMember.area || 'e.g. Near Community Center'}
                value={form.location}
                onChange={(e) => updateForm('location', e.target.value)}
              />
            </div>

            {error && (
              <div className="alert alert-warning" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>
            )}

            <button
              className="btn btn-primary btn-full btn-lg"
              type="submit"
              disabled={loading || !form.description}
            >
              {loading ? 'Creating Request…' : '🛡️ Create Request on Behalf of Member'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
