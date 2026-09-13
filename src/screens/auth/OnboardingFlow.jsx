import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ROLES, KYC_STATUS, DOCUMENT_TYPES } from '../../constants';
import { supabase } from '../../lib/supabase';
import { fetchAreasByPincode } from '../../lib/pincode';
import { sanitizeText, sanitizePhone } from '../../lib/sanitize';

const TOTAL_STEPS = 5;

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

// ── File Upload Box ───────────────────────────────────────
function FileUploadBox({ label, uploaded, onUpload, id }) {
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File must be under 5MB');
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
        onUpload({ file, base64: reader.result, name: file.name });
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
  };

  return (
    <div>
      <label
        htmlFor={id}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: `2px dashed ${uploaded ? 'var(--color-success)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '20px 16px',
          cursor: 'pointer',
          background: uploaded ? 'var(--color-success-bg)' : 'var(--color-surface-alt)',
          minHeight: 100,
          gap: 8,
        }}
      >
        {preview ? (
          <img src={preview} alt="preview" style={{ maxHeight: 80, maxWidth: '100%', borderRadius: 8, objectFit: 'cover' }} />
        ) : (
          <>
            <span style={{ fontSize: '1.8rem' }}>{uploaded ? '✅' : '📷'}</span>
            <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: uploaded ? 'var(--color-success)' : 'var(--color-text-secondary)', textAlign: 'center' }}>
              {uploading ? 'Processing…' : uploaded ? 'Uploaded ✓' : label}
            </span>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>JPG, PNG, PDF · Max 5MB</span>
          </>
        )}
      </label>
      <input
        id={id}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFile}
        aria-label={label}
      />
    </div>
  );
}

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    dob: '',
    pincode: '',
    area: '',
    roles: [],
    aadhaarLast4: '',
    documentType: 'aadhaar',
    documentTypeOther: '',
    idFront: null,
    idBack: null,
  });
  const [kycStatus, setKycStatus] = useState(null);
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
    updateForm('pincode', pincode.replace(/\D/g, '').slice(0, 6));
    updateForm('area', '');
    setAreas([]);
    setPincodeError('');
    if (pincode.length === 6) {
      setPincodeLoading(true);
      const result = await fetchAreasByPincode(pincode);
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
        return { ...prev, roles: current.filter((r) => r !== role) };
      } else {
        return { ...prev, roles: [...current, role] };
      }
    });
  }

  function handleVerifyKyc() {
    setLoading(true);
    setTimeout(() => {
      setKycStatus(KYC_STATUS.PENDING);
      setLoading(false);
      nextStep();
    }, 2000);
  }

  async function handleFinish() {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      const isUuid = (id) =>
        typeof id === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      const primaryRole = form.roles[0] || ROLES.SENIOR;
      const rolesArray = form.roles.length > 0 ? form.roles : [ROLES.SENIOR];

      const phoneValidation = sanitizePhone(form.phone);
      const safePhone = phoneValidation.valid ? phoneValidation.formatted : null;

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
        time_balance: primaryRole === ROLES.SENIOR ? 120 : 0,
        senior_mode: primaryRole === ROLES.SENIOR,
        id_document_type: form.documentType,
        id_document_other: form.documentType === 'other' ? sanitizeText(form.documentTypeOther, 100) : null,
        pincode_admin_approved: !rolesArray.includes(ROLES.ADMIN), // admin needs approval
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

      const routeMap = {
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

  const headerTitles = ['Create Account', 'Your Role', 'Verify Identity', 'KYC Status', 'All Done!'];
  const phoneValid = form.phone.replace(/\D/g, '').length === 10;
  const roleOptions = [
    {
      role: ROLES.SENIOR,
      emoji: '🧓',
      label: 'Senior Citizen',
      desc: 'I need help with daily tasks and errands.',
    },
    {
      role: ROLES.VOLUNTEER,
      emoji: '🤝',
      label: 'Volunteer',
      desc: 'I want to help seniors in my area.',
    },
    {
      role: ROLES.ADMIN,
      emoji: '🛡️',
      label: 'Pincode Admin',
      desc: 'I manage the Time Bank for my pincode. Requires Super Admin approval.',
    },
  ];

  return (
    <div className="page-content no-nav" style={{ background: 'white', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'var(--color-primary)', padding: 'var(--space-5)', paddingTop: 'env(safe-area-inset-top, var(--space-8))' }}>
        {step > 0 && (
          <button
            onClick={prevStep}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: 'white', fontSize: '1.2rem', marginBottom: 'var(--space-3)' }}
            aria-label="Go back"
          >←</button>
        )}
        <h2 style={{ color: 'white', marginBottom: 'var(--space-2)' }}>{headerTitles[step]}</h2>
        <div className="onboarding-progress">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className={`onboarding-dot${i <= step ? ' active' : ''}`} />
          ))}
        </div>
      </div>

      <div style={{ padding: 'var(--space-6) var(--space-5)' }}>

        {/* ── STEP 0: Personal Info ── */}
        {step === 0 && (
          <div>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)', fontSize: 'var(--font-size-sm)' }}>
              Tell us about yourself so we can set up your account.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Full Name */}
              <div className="input-group">
                <label className="input-label">Full Name *</label>
                <input
                  className="input"
                  placeholder="As on ID card"
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
                  placeholder="6-digit pincode"
                  value={form.pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  maxLength={6}
                />
                {pincodeLoading && <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', marginTop: 4 }}>🔍 Fetching areas…</p>}
                {pincodeError && <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>{pincodeError}</p>}
              </div>

              {/* Area / Locality — dropdown if areas available, else text input */}
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
                    placeholder="e.g. Colaba, Andheri West"
                    value={form.area}
                    onChange={(e) => updateForm('area', e.target.value)}
                  />
                )}
              </div>

              {/* Date of Birth (optional) */}
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
              Continue →
            </button>
          </div>
        )}

        {/* ── STEP 1: Role Selection (Multi-select) ── */}
        {step === 1 && (
          <div>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)', fontSize: 'var(--font-size-sm)' }}>
              Select all that apply — you can have multiple roles.
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
                    style={{ display: 'flex', alignItems: 'center', gap: 16 }}
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
                      {selected && <span style={{ color: 'white', fontSize: 14, fontWeight: 700 }}>✓</span>}
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
                <strong>ℹ️ Pincode Admin</strong> role requires approval from a Super Admin. You can use other selected roles immediately.
              </div>
            )}

            <button
              className="btn btn-primary btn-full btn-lg"
              style={{ marginTop: 'var(--space-6)' }}
              onClick={nextStep}
              disabled={form.roles.length === 0}
            >
              Continue → ({form.roles.length} role{form.roles.length !== 1 ? 's' : ''} selected)
            </button>
          </div>
        )}

        {/* ── STEP 2: ID Verification ── */}
        {step === 2 && (
          <div>
            <div className="alert alert-warning" style={{ marginBottom: 'var(--space-5)' }}>
              <strong>Security Notice:</strong> In production, documents are verified by a Pincode Admin within 24 hours. No data is transmitted to third parties.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Document Type */}
              <div className="input-group">
                <label className="input-label">ID Document Type</label>
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
                  <label className="input-label">Specify Document Type</label>
                  <input
                    className="input"
                    placeholder="e.g. College ID, Bank Passbook"
                    value={form.documentTypeOther}
                    onChange={(e) => updateForm('documentTypeOther', e.target.value)}
                  />
                </div>
              )}

              {/* Aadhaar last 4 (only for aadhaar) */}
              {form.documentType === 'aadhaar' && (
                <div className="input-group">
                  <label className="input-label">Last 4 Digits of Aadhaar</label>
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    placeholder="XXXX"
                    value={form.aadhaarLast4}
                    onChange={(e) => updateForm('aadhaarLast4', e.target.value.slice(0, 4))}
                    maxLength={4}
                    style={{ letterSpacing: '0.3em', fontSize: 'var(--font-size-xl)' }}
                  />
                </div>
              )}

              {/* ID Front */}
              <div className="input-group">
                <label className="input-label">ID Document — Front</label>
                <FileUploadBox
                  id="id-front"
                  label="Tap to capture / upload Front"
                  uploaded={!!form.idFront}
                  onUpload={(data) => updateForm('idFront', data)}
                />
              </div>

              {/* ID Back */}
              <div className="input-group">
                <label className="input-label">ID Document — Back</label>
                <FileUploadBox
                  id="id-back"
                  label="Tap to capture / upload Back"
                  uploaded={!!form.idBack}
                  onUpload={(data) => updateForm('idBack', data)}
                />
              </div>
            </div>

            <button
              className="btn btn-primary btn-full btn-lg"
              style={{ marginTop: 'var(--space-6)' }}
              onClick={handleVerifyKyc}
              disabled={loading || !form.idFront || !form.idBack || (form.documentType === 'other' && !form.documentTypeOther)}
            >
              {loading
                ? <span>Submitting… <span className="loading-spinner" style={{ width: 20, height: 20, display: 'inline-block', verticalAlign: 'middle' }} /></span>
                : 'Submit for Verification →'}
            </button>
          </div>
        )}

        {/* ── STEP 3: KYC Status ── */}
        {step === 3 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>
              {kycStatus === KYC_STATUS.PENDING ? '⏳' : kycStatus === KYC_STATUS.VERIFIED ? '✅' : '❌'}
            </div>
            <h3 style={{ marginBottom: 'var(--space-3)' }}>
              {kycStatus === KYC_STATUS.PENDING ? 'Verification Pending' : kycStatus === KYC_STATUS.VERIFIED ? 'Verified!' : 'Rejected'}
            </h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)', fontSize: 'var(--font-size-sm)' }}>
              {kycStatus === KYC_STATUS.PENDING
                ? 'Your documents have been submitted. A Pincode Admin will review within 24 hours. You will receive an SMS notification.'
                : kycStatus === KYC_STATUS.VERIFIED
                  ? 'Your identity has been verified. Welcome!'
                  : 'Documents could not be verified. Please re-submit with clear photos.'}
            </p>
            <div className="alert alert-info" style={{ textAlign: 'left', marginBottom: 'var(--space-5)' }}>
              The Pincode Admin can approve your registration from their dashboard.
            </div>
            <button className="btn btn-primary btn-full btn-lg" onClick={nextStep}>
              Continue →
            </button>
          </div>
        )}

        {/* ── STEP 4: Done ── */}
        {step === 4 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>🎉</div>
            <h2 style={{ marginBottom: 'var(--space-3)' }}>Welcome, {form.name || 'friend'}!</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)', fontSize: 'var(--font-size-sm)' }}>
              Your account has been created. While KYC is reviewed, you can explore the app.
            </p>
            <div style={{ background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', marginBottom: 'var(--space-5)', textAlign: 'left' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {[
                  { label: 'Name', value: form.name || '-' },
                  { label: 'Mobile', value: form.phone ? `+91 ${form.phone}` : '-' },
                  { label: 'Role(s)', value: form.roles.map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(', ') || '-' },
                  { label: 'Pincode', value: form.pincode || '-' },
                  { label: 'Area', value: form.area || '-' },
                  { label: 'DOB', value: form.dob || 'Not provided' },
                  { label: 'KYC Status', value: 'Pending Review' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>{label}</span>
                    <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <button className="btn btn-primary btn-full btn-lg" onClick={handleFinish} disabled={loading}>
              {loading ? 'Setting up…' : 'Go to My Dashboard →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
