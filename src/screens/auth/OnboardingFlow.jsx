import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ROLES, KYC_STATUS, DOCUMENT_TYPES } from '../../constants';
import { supabase } from '../../lib/supabase';
import { fetchAreasByPincode } from '../../lib/pincode';
import { sanitizeText, sanitizePhone } from '../../lib/sanitize';
import Modal from '../../components/common/Modal';
import { Eye, RefreshCw, Trash2, Check, AlertCircle, Shield, KeyRound } from 'lucide-react';

const TOTAL_STEPS = 4;
const STEP_LABELS = [
  '1/4 — Your Details',
  '2/4 — Roles',
  '3/4 — Verify Identity',
  '4/4 — Complete',
];

const STEP_TITLES = [
  'Personal Details',
  'Select Your Role',
  'Identity Verification',
  'Account Ready',
];

// ── DOB Picker Component ──────────────────────────────────
function DOBPicker({ value, onChange }) {
  const today = new Date();
  const years = Array.from({ length: 100 }, (_, i) => today.getFullYear() - i);
  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];
  const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate();

  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      setDay(String(d.getDate()));
      setMonth(String(d.getMonth() + 1));
      setYear(String(d.getFullYear()));
    }
  }, []);

  const handleChange = (d, m, y) => {
    if (d && m && y) {
      const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      if (!isNaN(date.getTime())) {
        onChange(date.toISOString().split('T')[0]);
      }
    } else {
      onChange('');
    }
  };

  const selectStyle = {
    flex: 1,
    padding: '12px 8px',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-base)',
    background: 'white',
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-family)',
    cursor: 'pointer',
    minHeight: 48,
  };

  const daysInMonth = month && year ? getDaysInMonth(parseInt(month), parseInt(year)) : 31;

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <select
        style={selectStyle}
        value={day}
        onChange={(e) => { setDay(e.target.value); handleChange(e.target.value, month, year); }}
        aria-label="Day"
      >
        <option value="">Day</option>
        {Array.from({ length: daysInMonth }, (_, i) => (
          <option key={i+1} value={i+1}>{i+1}</option>
        ))}
      </select>
      <select
        style={{ ...selectStyle, flex: 1.5 }}
        value={month}
        onChange={(e) => { setMonth(e.target.value); handleChange(day, e.target.value, year); }}
        aria-label="Month"
      >
        <option value="">Month</option>
        {months.map((m, i) => (
          <option key={i+1} value={i+1}>{m}</option>
        ))}
      </select>
      <select
        style={{ ...selectStyle, flex: 1.2 }}
        value={year}
        onChange={(e) => { setYear(e.target.value); handleChange(day, month, e.target.value); }}
        aria-label="Year"
      >
        <option value="">Year</option>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}

// ── File Upload Box with View & Replace ───────────────────
function FileUploadCard({ label, fileData, onUpload, onRemove, id }) {
  const [viewOpen, setViewOpen] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    // Validation: max 5MB
    if (file.size > 5 * 1024 * 1024) {
      setError('File must be under 5MB.');
      return;
    }

    // Validation: JPG, PNG, WEBP, PDF
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|pdf)$/i)) {
      setError('Allowed file types: JPG, PNG, PDF');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      onUpload({
        name: file.name,
        type: file.type,
        size: file.size,
        base64: reader.result,
        file,
      });
    };
    reader.readAsDataURL(file);
  };

  const isUploaded = Boolean(fileData?.base64 || fileData?.name);
  const isPdf = fileData?.type === 'application/pdf' || (fileData?.name || '').toLowerCase().endsWith('.pdf');

  return (
    <div style={{ marginBottom: 'var(--space-3)' }}>
      <label style={{ display: 'block', fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 6 }}>
        {label} *
      </label>

      {error && (
        <div style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {isUploaded ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface-alt, #f8f9fa)',
            border: '1.5px solid var(--color-success, #27AE60)',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            {isPdf ? (
              <div style={{ background: '#E74C3C', color: 'white', fontWeight: 700, fontSize: 10, padding: '4px 6px', borderRadius: 4 }}>
                PDF
              </div>
            ) : (
              <img
                src={fileData.base64}
                alt="thumb"
                style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', border: '1px solid #ddd' }}
              />
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fileData.name || 'Document uploaded'}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-success)', fontWeight: 500 }}>
                ✓ Attached ready for review
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {!isPdf && (
              <button
                type="button"
                onClick={() => setViewOpen(true)}
                className="btn btn-outline btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', fontSize: 'var(--font-size-xs)' }}
              >
                <Eye size={13} /> View
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-outline btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', fontSize: 'var(--font-size-xs)' }}
            >
              <RefreshCw size={13} /> Replace
            </button>
            <button
              type="button"
              onClick={() => onRemove()}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', padding: 6 }}
              aria-label="Remove document"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed var(--color-border, #CBD5E1)',
            borderRadius: 'var(--radius-md)',
            padding: '22px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            background: 'var(--color-surface-alt, #F8FAFC)',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>📷</div>
          <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)' }}>
            Tap to upload {label}
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
            JPG, PNG, PDF · Max 5MB
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Preview Modal */}
      <Modal isOpen={viewOpen} onClose={() => setViewOpen(false)} center title={label}>
        <div style={{ textAlign: 'center', padding: 12 }}>
          {fileData?.base64 && (
            <img
              src={fileData.base64}
              alt={label}
              style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8, objectFit: 'contain' }}
            />
          )}
          <button className="btn btn-primary btn-full" style={{ marginTop: 16 }} onClick={() => setViewOpen(false)}>
            Done
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const { login, setUserPin } = useApp();
  const [step, setStep] = useState(0);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    dob: '',
    pincode: '',
    area: '',
    roles: [ROLES.MEMBER], // defaults to Member (Senior Citizen)
    aadhaarLast4: '',
    documentType: 'aadhaar',
    documentTypeOther: '',
    idFront: null,
    idBack: null,
    pin: '',
  });

  const [loading, setLoading] = useState(false);
  const [areas, setAreas] = useState([]);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState('');

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function nextStep() { setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1)); }
  function prevStep() { setStep((s) => Math.max(s - 1, 0)); }

  // Load areas when pincode changes
  const handlePincodeChange = useCallback(async (pincode) => {
    const clean = pincode.replace(/\D/g, '').slice(0, 6);
    updateForm('pincode', clean);
    updateForm('area', '');
    setAreas([]);
    setPincodeError('');
    if (clean.length === 6) {
      setPincodeLoading(true);
      const result = await fetchAreasByPincode(clean);
      setPincodeLoading(false);
      if (result.length === 0) {
        setPincodeError('No areas found for this pincode. Please enter manually.');
      } else {
        setAreas(result);
        updateForm('area', result[0].display);
      }
    }
  }, []);

  function toggleRole(role) {
    setForm((prev) => {
      const current = prev.roles || [];
      if (current.includes(role)) {
        if (current.length === 1) return prev; // must have at least one role
        return { ...prev, roles: current.filter((r) => r !== role) };
      } else {
        return { ...prev, roles: [...current, role] };
      }
    });
  }

  async function handleFinish() {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      const isUuid = (id) =>
        typeof id === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      const primaryRole = form.roles[0] || ROLES.MEMBER;
      const rolesArray = form.roles.length > 0 ? form.roles : [ROLES.MEMBER];

      const phoneValidation = sanitizePhone(form.phone);
      const safePhone = phoneValidation.valid ? phoneValidation.formatted : null;
      const cleanPin = form.pin ? String(form.pin).replace(/\D/g, '').slice(0, 4) : null;

      const profilePayload = {
        id: authUser?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}`),
        phone: safePhone,
        name: sanitizeText(form.name || 'New Member', 100),
        dob: form.dob || null,
        role: primaryRole,
        roles: rolesArray,
        active_role: primaryRole,
        pincode: sanitizeText(form.pincode || '400001', 6),
        area: sanitizeText(form.area || 'Mumbai', 100),
        kyc_status: KYC_STATUS.PENDING,
        time_balance: 0, // Pure Seva starts at 0 Seva Given
        senior_mode: primaryRole === ROLES.MEMBER || primaryRole === 'senior',
        id_document_type: form.documentType,
        id_document_other: form.documentType === 'other' ? sanitizeText(form.documentTypeOther, 100) : null,
        pincode_admin_approved: !rolesArray.includes(ROLES.ADMIN),
        pin: cleanPin,
      };

      if (authUser?.id && isUuid(authUser.id)) {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .upsert([profilePayload])
            .select()
            .single();

          if (error) console.warn('Profile save note:', error);
          login(profile || profilePayload);
        } catch (err) {
          login(profilePayload);
        }
      } else {
        login(profilePayload);
      }

      if (cleanPin && cleanPin.length === 4) {
        try { await setUserPin(cleanPin); } catch (e) {}
      }

      const routeMap = {
        member: '/senior/home',
        senior: '/senior/home',
        volunteer: '/volunteer/home',
        admin: '/admin/dashboard',
        super_admin: '/admin/dashboard',
      };
      navigate(routeMap[primaryRole] || '/senior/home');
    } catch (err) {
      console.error('Onboarding error:', err);
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  const phoneValid = form.phone.replace(/\D/g, '').length === 10;
  const roleOptions = [
    {
      role: ROLES.MEMBER,
      emoji: '🧓',
      label: 'Senior Citizen (Member)',
      desc: 'I or a family member would like to receive community care and assistance.',
    },
    {
      role: ROLES.VOLUNTEER,
      emoji: '🤝',
      label: 'Volunteer',
      desc: 'I want to offer Seva and help community members in my area.',
    },
    {
      role: ROLES.ADMIN,
      emoji: '🛡️',
      label: 'Pincode Admin',
      desc: 'I manage Time Bank registrations for my pincode. Requires Super Admin approval.',
    },
  ];

  return (
    <div className="page-content no-nav" style={{ background: 'white', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'var(--color-primary)', padding: 'var(--space-5)', paddingTop: 'env(safe-area-inset-top, var(--space-8))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
          {step > 0 ? (
            <button
              onClick={prevStep}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: 'white', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Go back"
            >←</button>
          ) : <div style={{ width: 36 }} />}
          <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 'var(--font-size-xs)', fontWeight: 700, letterSpacing: '0.05em' }}>
            {STEP_LABELS[step]}
          </div>
          <div style={{ width: 36 }} />
        </div>

        <h2 style={{ color: 'white', marginBottom: 'var(--space-2)', textAlign: 'center' }}>{STEP_TITLES[step]}</h2>
        <div className="onboarding-progress">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className={`onboarding-dot${i <= step ? ' active' : ''}`} />
          ))}
        </div>
      </div>

      <div style={{ padding: 'var(--space-6) var(--space-5)' }}>

        {/* ── STEP 0: 1/4 — Your Details ── */}
        {step === 0 && (
          <div>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)', fontSize: 'var(--font-size-sm)' }}>
              Tell us your basic details to set up your Time Bank account.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Full Name */}
              <div className="input-group">
                <label className="input-label">Full Name *</label>
                <input
                  className="input"
                  placeholder="As per Government ID"
                  value={form.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  autoComplete="name"
                />
              </div>

              {/* Mobile Number */}
              <div className="input-group">
                <label className="input-label">Mobile Number *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="input" style={{ width: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontWeight: 600, padding: '0 8px' }}>+91</span>
                  <input
                    className="input"
                    type="tel"
                    inputMode="numeric"
                    placeholder="10-digit mobile number"
                    value={form.phone}
                    onChange={(e) => updateForm('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    maxLength={10}
                    autoComplete="tel"
                    style={{ flex: 1 }}
                  />
                </div>
                {form.phone && !phoneValid && (
                  <p style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)', marginTop: 4 }}>Must be exactly 10 digits</p>
                )}
              </div>

              {/* Pincode */}
              <div className="input-group">
                <label className="input-label">Pincode *</label>
                <input
                  className="input"
                  inputMode="numeric"
                  placeholder="6-digit PIN code"
                  value={form.pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  maxLength={6}
                />
                {pincodeLoading && <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', marginTop: 4 }}>🔍 Fetching locality via India Post…</p>}
                {pincodeError && <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>{pincodeError}</p>}
              </div>

              {/* Area / Locality */}
              <div className="input-group">
                <label className="input-label">Area / Locality *</label>
                {areas.length > 0 ? (
                  <select
                    className="input"
                    value={form.area}
                    onChange={(e) => updateForm('area', e.target.value)}
                  >
                    {areas.map((a) => (
                      <option key={a.name} value={a.display}>{a.display}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="input"
                    placeholder="e.g. Colaba, Mandhan, Indiranagar"
                    value={form.area}
                    onChange={(e) => updateForm('area', e.target.value)}
                  />
                )}
              </div>

              {/* Date of Birth */}
              <div className="input-group">
                <label className="input-label">Date of Birth <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span></label>
                <DOBPicker value={form.dob} onChange={(val) => updateForm('dob', val)} />
              </div>
            </div>

            <button
              className="btn btn-primary btn-full btn-lg"
              style={{ marginTop: 'var(--space-6)' }}
              onClick={nextStep}
              disabled={!form.name || !phoneValid || !form.pincode || !form.area}
            >
              Continue to Roles (2/4) →
            </button>
          </div>
        )}

        {/* ── STEP 1: 2/4 — Roles ── */}
        {step === 1 && (
          <div>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)', fontSize: 'var(--font-size-sm)' }}>
              Choose your roles. You can select multiple roles on a single account and switch between them anytime without logging out.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {roleOptions.map(({ role, emoji, label, desc }) => {
                const selected = form.roles.includes(role);
                return (
                  <div
                    key={role}
                    className={`role-card${selected ? ' selected' : ''}`}
                    onClick={() => toggleRole(role)}
                    role="checkbox"
                    aria-checked={selected}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && toggleRole(role)}
                    style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
                  >
                    <div
                      style={{
                        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                        border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        background: selected ? 'var(--color-primary)' : 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      {selected && <Check size={16} color="white" />}
                    </div>
                    <span className="role-card-emoji">{emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 'var(--font-size-base)', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {form.roles.includes(ROLES.ADMIN) && (
              <div className="alert alert-info" style={{ marginTop: 'var(--space-4)' }}>
                <strong>🛡️ Pincode Admin Notice</strong>: Requires approval from the Super Admin. You can begin utilizing Member/Volunteer capabilities immediately while admin credentials are confirmed.
              </div>
            )}

            <button
              className="btn btn-primary btn-full btn-lg"
              style={{ marginTop: 'var(--space-6)' }}
              onClick={nextStep}
              disabled={form.roles.length === 0}
            >
              Continue to Identity Verification (3/4) →
            </button>
          </div>
        )}

        {/* ── STEP 2: 3/4 — Verify Identity ── */}
        {step === 2 && (
          <div>
            <div className="alert alert-warning" style={{ marginBottom: 'var(--space-5)' }}>
              <strong>🔒 Privacy First:</strong> For your security, Time Bank only asks for the <strong>last 4 digits</strong> of Aadhaar. Document photos are stored securely for local admin verification only.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Document Type */}
              <div className="input-group">
                <label className="input-label">Select ID Document Type *</label>
                <select
                  className="input"
                  value={form.documentType}
                  onChange={(e) => updateForm('documentType', e.target.value)}
                >
                  {DOCUMENT_TYPES.map((dt) => (
                    <option key={dt.value} value={dt.value}>{dt.label}</option>
                  ))}
                </select>
              </div>

              {/* Free text if Other */}
              {form.documentType === 'other' && (
                <div className="input-group">
                  <label className="input-label">Specify Document Name *</label>
                  <input
                    className="input"
                    placeholder="e.g. Pensioner ID, Senior Citizen Card"
                    value={form.documentTypeOther}
                    onChange={(e) => updateForm('documentTypeOther', e.target.value)}
                  />
                </div>
              )}

              {/* Aadhaar last 4 digits only */}
              {form.documentType === 'aadhaar' && (
                <div className="input-group">
                  <label className="input-label">Last 4 Digits of Aadhaar *</label>
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    placeholder="•••• •••• 1234"
                    value={form.aadhaarLast4}
                    onChange={(e) => updateForm('aadhaarLast4', e.target.value.replace(/\D/g, '').slice(0, 4))}
                    maxLength={4}
                    style={{ letterSpacing: '0.25em', fontSize: 'var(--font-size-lg)', fontWeight: 700 }}
                  />
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
                    Enter only the last 4 digits (e.g. 5678). Full Aadhaar is never stored.
                  </p>
                </div>
              )}

              {/* ID Front Upload */}
              <FileUploadCard
                id="doc-front"
                label="ID Document — Front"
                fileData={form.idFront}
                onUpload={(data) => updateForm('idFront', data)}
                onRemove={() => updateForm('idFront', null)}
              />

              {/* ID Back Upload */}
              <FileUploadCard
                id="doc-back"
                label="ID Document — Back"
                fileData={form.idBack}
                onUpload={(data) => updateForm('idBack', data)}
                onRemove={() => updateForm('idBack', null)}
              />
            </div>

            <button
              className="btn btn-primary btn-full btn-lg"
              style={{ marginTop: 'var(--space-6)' }}
              onClick={nextStep}
              disabled={!form.idFront || !form.idBack || (form.documentType === 'aadhaar' && form.aadhaarLast4.length !== 4) || (form.documentType === 'other' && !form.documentTypeOther)}
            >
              Review & Complete (4/4) →
            </button>
          </div>
        )}

        {/* ── STEP 3: 4/4 — Complete & Security Setup ── */}
        {step === 3 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-5)' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: 8 }}>🎉</div>
              <h3 style={{ marginBottom: 4 }}>Welcome, {form.name || 'Member'}!</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                Your Time Bank profile has been prepared with the Pure Seva Model.
              </p>
            </div>

            {/* KYC Pending Notice */}
            <div
              style={{
                background: '#FEF9E7',
                border: '1.5px solid #F39C12',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-4)',
                marginBottom: 'var(--space-5)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>⏳</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: '#B7950B', marginBottom: 4 }}>
                    KYC Status: Verification in Review
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                    Your documents have been submitted securely to your local Pincode Admin. You can explore the community immediately; full task acceptance will unlock once verification is approved.
                  </div>
                </div>
              </div>
            </div>

            {/* Optional 4-Digit Quick PIN */}
            <div className="card" style={{ marginBottom: 'var(--space-5)', border: '1.5px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <KeyRound size={18} color="var(--color-primary)" />
                <h4 style={{ margin: 0 }}>Set Quick Login PIN (Optional)</h4>
              </div>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 12 }}>
                Set a 4-digit PIN for instant returning logins without waiting for SMS OTP every time.
              </p>
              <input
                className="input"
                type="password"
                inputMode="numeric"
                placeholder="4-digit PIN (e.g. 1234)"
                value={form.pin}
                onChange={(e) => updateForm('pin', e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: 'var(--font-size-lg)', fontWeight: 700 }}
              />
            </div>

            {/* Registration Summary Card */}
            <div style={{ background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {[
                  { label: 'Full Name', value: form.name || '-' },
                  { label: 'Mobile Number', value: `+91 ${form.phone}` },
                  { label: 'Selected Role(s)', value: form.roles.map((r) => r === ROLES.MEMBER ? 'Senior Citizen (Member)' : r.charAt(0).toUpperCase() + r.slice(1)).join(', ') },
                  { label: 'Pincode & Locality', value: `${form.pincode} · ${form.area}` },
                  { label: 'ID Document', value: DOCUMENT_TYPES.find(d => d.value === form.documentType)?.label || form.documentType },
                  ...(form.documentType === 'aadhaar' ? [{ label: 'Aadhaar (last 4)', value: `•••• ${form.aadhaarLast4}` }] : []),
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>{label}:</span>
                    <span style={{ fontWeight: 600, textAlign: 'right' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              className="btn btn-primary btn-full btn-lg"
              onClick={handleFinish}
              disabled={loading}
              style={{ minHeight: 52 }}
            >
              {loading ? 'Completing Setup…' : 'Complete Setup & Go to Dashboard →'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
