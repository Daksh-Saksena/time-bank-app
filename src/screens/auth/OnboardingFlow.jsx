import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ROLES, KYC_STATUS } from '../../data/mockData';
const TOTAL_STEPS = 5;
export default function OnboardingFlow() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '', phone: '', age: '', pincode: '', area: '',
    role: null,
    aadhaarLast4: '', documentType: 'Aadhaar Card',
    documentUploaded: false,
  });
  const [kycStatus, setKycStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }
  function nextStep() { setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1)); }
  function prevStep() { setStep((s) => Math.max(s - 1, 0)); }
  function handleVerifyKyc() {
    setLoading(true);
    setTimeout(() => {
      setKycStatus(KYC_STATUS.PENDING);
      setLoading(false);
      nextStep();
    }, 2000);
  }
  function handleFinish() {
    const roleUserMap = { senior: 'user-001', volunteer: 'user-002', admin: 'user-003' };
    const userId = roleUserMap[form.role] || 'user-001';
    login(userId);
    const routeMap = { senior: '/senior/home', volunteer: '/volunteer/home', admin: '/admin/dashboard' };
    navigate(routeMap[form.role] || '/senior/home');
  }
  return (
    <div className="page-content no-nav" style={{ background: 'white', minHeight: '100vh' }}>
      <div style={{ background: 'var(--color-primary)', padding: 'var(--space-5)', paddingTop: 'var(--space-8)' }}>
        {step > 0 && (
          <button
            onClick={prevStep}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: 'white', fontSize: '1.2rem', marginBottom: 'var(--space-3)' }}
          >←</button>
        )}
        <h2 style={{ color: 'white', marginBottom: 'var(--space-2)' }}>
          {['Create Account', 'Your Role', 'Verify Identity', 'KYC Status', 'All Done!'][step]}
        </h2>
        <div className="onboarding-progress">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className={`onboarding-dot${i <= step ? ' active' : ''}`} />
          ))}
        </div>
      </div>
      <div style={{ padding: 'var(--space-6) var(--space-5)' }}>
        {step === 0 && (
          <div>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)', fontSize: 'var(--font-size-sm)' }}>
              Tell us about yourself so we can set up your account.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <input className="input" placeholder="As on Aadhaar card" value={form.name} onChange={(e) => updateForm('name', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Phone Number</label>
                <input className="input" type="tel" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Age</label>
                <input className="input" type="number" placeholder="Your age" value={form.age} onChange={(e) => updateForm('age', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Pincode</label>
                <input className="input" placeholder="6-digit pincode" value={form.pincode} onChange={(e) => updateForm('pincode', e.target.value.slice(0, 6))} />
              </div>
              <div className="input-group">
                <label className="input-label">Area / Locality</label>
                <input className="input" placeholder="e.g. Colaba, Mumbai" value={form.area} onChange={(e) => updateForm('area', e.target.value)} />
              </div>
            </div>
            <button
              className="btn btn-primary btn-full btn-lg"
              style={{ marginTop: 'var(--space-6)' }}
              onClick={nextStep}
              disabled={!form.name || !form.phone || !form.pincode}
            >
              Continue →
            </button>
          </div>
        )}
        {step === 1 && (
          <div>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)', fontSize: 'var(--font-size-sm)' }}>
              How would you like to participate in the Time Bank?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {[
                { role: ROLES.SENIOR, emoji: '', label: 'Senior Citizen', desc: 'I need help with daily tasks and errands. I can receive time-based services from the community.' },
                { role: ROLES.VOLUNTEER, emoji: '', label: 'Volunteer', desc: 'I want to help seniors in my area. I earn time credits for my service.' },
                { role: ROLES.ADMIN, emoji: '', label: 'Pincode Admin', desc: 'I manage the Time Bank for my pincode — approving members and overseeing activity.' },
              ].map(({ role, emoji, label, desc }) => (
                <div
                  key={role}
                  className={`role-card${form.role === role ? ' selected' : ''}`}
                  onClick={() => updateForm('role', role)}
                  role="radio"
                  aria-checked={form.role === role}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && updateForm('role', role)}
                >
                  <span className="role-card-emoji">{emoji}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 'var(--font-size-base)', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="btn btn-primary btn-full btn-lg"
              style={{ marginTop: 'var(--space-6)' }}
              onClick={nextStep}
              disabled={!form.role}
            >
              Continue →
            </button>
          </div>
        )}
        {step === 2 && (
          <div>
            <div className="alert alert-warning" style={{ marginBottom: 'var(--space-5)' }}>
              <strong>Prototype Notice:</strong> This is a demonstration. In production, real Aadhaar verification would use a secure, government-approved API (e.g., UIDAI sandbox). No real Aadhaar data is stored or transmitted here.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="input-group">
                <label className="input-label">ID Document Type</label>
                <select className="input" value={form.documentType} onChange={(e) => updateForm('documentType', e.target.value)}>
                  <option>Aadhaar Card</option>
                  <option>Voter ID</option>
                  <option>PAN Card</option>
                  <option>Passport</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Last 4 digits of Aadhaar</label>
                <input
                  className="input"
                  type="number"
                  placeholder="XXXX"
                  value={form.aadhaarLast4}
                  onChange={(e) => updateForm('aadhaarLast4', e.target.value.slice(0, 4))}
                  maxLength={4}
                  style={{ letterSpacing: '0.3em', fontSize: 'var(--font-size-xl)' }}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Upload ID Document</label>
                <div
                  style={{ border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-8)', textAlign: 'center', cursor: 'pointer', background: form.documentUploaded ? 'var(--color-success-bg)' : 'var(--color-surface-alt)' }}
                  onClick={() => updateForm('documentUploaded', true)}
                >
                  {form.documentUploaded ? (
                    <>
                      <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}></div>
                      <div style={{ fontWeight: 600, color: 'var(--color-success)' }}>Document uploaded</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}></div>
                      <div style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Tap to capture / upload</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>JPG, PNG, PDF up to 5MB</div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              className="btn btn-primary btn-full btn-lg"
              style={{ marginTop: 'var(--space-6)' }}
              onClick={handleVerifyKyc}
              disabled={loading || !form.aadhaarLast4 || !form.documentUploaded}
            >
              {loading ? (
                <span>Submitting for Verification… <span className="loading-spinner" style={{ width: 20, height: 20, display: 'inline-block', verticalAlign: 'middle' }} /></span>
              ) : 'Submit for Verification →'}
            </button>
          </div>
        )}
        {step === 3 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>
              {kycStatus === KYC_STATUS.PENDING ? '' : kycStatus === KYC_STATUS.VERIFIED ? '' : ''}
            </div>
            <h3 style={{ marginBottom: 'var(--space-3)' }}>
              {kycStatus === KYC_STATUS.PENDING ? 'Verification Pending' : kycStatus === KYC_STATUS.VERIFIED ? 'Verified!' : 'Rejected'}
            </h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)', fontSize: 'var(--font-size-sm)' }}>
              {kycStatus === KYC_STATUS.PENDING
                ? 'Your documents have been submitted. A Pincode Admin will review and approve your profile within 24 hours. You will receive an SMS notification.'
                : kycStatus === KYC_STATUS.VERIFIED
                  ? 'Your identity has been verified. Welcome to the Time Bank!'
                  : 'Your documents could not be verified. Please re-submit with clear photos.'}
            </p>
            <div className="alert alert-info" style={{ textAlign: 'left', marginBottom: 'var(--space-5)' }}>
              In this demo, verification is in "Pending" state. The Pincode Admin can approve your registration from their dashboard.
            </div>
            <button className="btn btn-primary btn-full btn-lg" onClick={nextStep}>
              Continue →
            </button>
          </div>
        )}
        {step === 4 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}></div>
            <h2 style={{ marginBottom: 'var(--space-3)' }}>Welcome, {form.name || 'friend'}!</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)', fontSize: 'var(--font-size-sm)' }}>
              Your account has been created. While your KYC is being reviewed, you can explore the app.
            </p>
            <div style={{ background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', marginBottom: 'var(--space-5)', textAlign: 'left' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {[
                  { label: 'Name', value: form.name || '—' },
                  { label: 'Phone', value: form.phone || '—' },
                  { label: 'Role', value: form.role ? form.role.charAt(0).toUpperCase() + form.role.slice(1) : '—' },
                  { label: 'Pincode', value: form.pincode || '—' },
                  { label: 'KYC Status', value: 'Pending Review' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>{label}</span>
                    <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <button className="btn btn-primary btn-full btn-lg" onClick={handleFinish}>
              Go to My Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
