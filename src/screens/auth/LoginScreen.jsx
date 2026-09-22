import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { KeyRound, Smartphone, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function LoginScreen() {
  const { login, loginWithPin } = useApp();
  const navigate = useNavigate();

  // Mode: 'otp' | 'pin'
  const [authMode, setAuthMode] = useState('otp');

  // Phone & OTP state
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [otp, setOtp] = useState('');

  // PIN login state
  const [pin, setPin] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  function routeUser(profile) {
    const routeMap = {
      senior: '/senior/home',
      member: '/senior/home',
      volunteer: '/volunteer/home',
      admin: '/admin/dashboard',
      super_admin: '/admin/dashboard',
    };
    const activeRole = profile.active_role || profile.role || 'member';
    navigate(routeMap[activeRole] || '/senior/home');
  }

  // ── Handle Quick PIN Login ────────────────────────────────
  async function handlePinLogin(e) {
    e.preventDefault();
    if (!phone || phone.replace(/\D/g, '').length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!pin || pin.length !== 4) {
      setError('Please enter your 4-digit security PIN.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const profile = await loginWithPin(phone, pin);
      if (profile) {
        routeUser(profile);
      }
    } catch (err) {
      setError(err.message || 'Invalid PIN. If you have not created a PIN yet, please sign in via Mobile OTP.');
    } finally {
      setLoading(false);
    }
  }

  // ── Handle Send OTP ───────────────────────────────────────
  async function handleSendOtp(e) {
    e.preventDefault();
    const cleanDigits = phone.replace(/\D/g, '');
    if (!cleanDigits || cleanDigits.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const fullPhone = `+91${cleanDigits}`;
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
        options: {
          shouldCreateUser: true,
          channel: 'sms',
        },
      });

      if (otpErr) {
        console.warn('Supabase OTP Error (fallback available):', otpErr);
        // Inform user or allow demo bypass
        setError(otpErr.message || 'Error sending SMS. Check Twilio/Supabase configuration.');
        return;
      }

      setInfo(`OTP sent successfully to ${fullPhone}`);
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please check your network.');
    } finally {
      setLoading(false);
    }
  }

  // ── Handle Verify OTP ─────────────────────────────────────
  async function handleVerifyOtp(e) {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      setError('Please enter the verification code');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const cleanDigits = phone.replace(/\D/g, '');
      const fullPhone = `+91${cleanDigits}`;
      const { data, error: verifyErr } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: otp.trim(),
        type: 'sms',
      });

      if (verifyErr) throw verifyErr;

      if (data?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profile) {
          login(profile);
          routeUser(profile);
        } else {
          navigate('/onboarding');
        }
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-content no-nav" style={{ background: 'white', minHeight: '100vh' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
          padding: 'var(--space-8) var(--space-5) var(--space-10)',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <button
          onClick={() => navigate('/')}
          style={{
            position: 'absolute',
            left: 'var(--space-4)',
            top: 'var(--space-4)',
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '50%',
            width: 40,
            height: 40,
            cursor: 'pointer',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>

        <div style={{ marginBottom: 'var(--space-3)' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
        </div>
        <h2 style={{ color: 'white', fontWeight: 800, marginBottom: 4, fontSize: '1.6rem' }}>
          लॉगिन (Sign In)
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 'var(--font-size-sm)', margin: 0, fontWeight: 500 }}>
          Time Bank of India — Pure Seva Community
        </p>
      </div>

      <div style={{ padding: 'var(--space-6) var(--space-5)', maxWidth: 440, margin: '-20px auto 0' }}>
        {/* Auth Mode Toggle */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            background: '#F1F5F9',
            padding: 4,
            borderRadius: 'var(--radius-lg)',
            marginBottom: 24,
            boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setAuthMode('otp');
              setError('');
              setInfo('');
            }}
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: authMode === 'otp' ? 'white' : 'transparent',
              color: authMode === 'otp' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontWeight: authMode === 'otp' ? 800 : 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: authMode === 'otp' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Smartphone size={16} />
            <span>मोबाइल OTP</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('pin');
              setError('');
              setInfo('');
            }}
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: authMode === 'pin' ? 'white' : 'transparent',
              color: authMode === 'pin' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontWeight: authMode === 'pin' ? 800 : 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: authMode === 'pin' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <KeyRound size={16} />
            <span>4-अंकीय PIN</span>
          </button>
        </div>

        {/* ── Mode 1: Mobile OTP Flow ──────────────────────── */}
        {authMode === 'otp' && (
          <div>
            {step === 'phone' ? (
              <form onSubmit={handleSendOtp}>
                <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
                  <label className="input-label" style={{ fontWeight: 700 }}>
                    मोबाइल नंबर (Mobile Number)
                  </label>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <span
                      className="input"
                      style={{
                        width: 68,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-text-muted)',
                        fontWeight: 700,
                        background: '#F8FAFC',
                      }}
                    >
                      +91
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      className="input"
                      placeholder="10 अंकों का नंबर"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      maxLength={10}
                      autoFocus
                      autoComplete="tel"
                      style={{ fontSize: '1.05rem', fontWeight: 600 }}
                    />
                  </div>
                  {phone && phone.replace(/\D/g, '').length !== 10 && phone.length > 0 && (
                    <p style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)', marginTop: 4 }}>
                      कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें
                    </p>
                  )}
                </div>

                {error && (
                  <p style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>
                    {error}
                  </p>
                )}
                {info && (
                  <p style={{ color: 'var(--color-primary)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-3)', background: 'var(--color-surface-alt)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)' }}>
                    {info}
                  </p>
                )}

                <button
                  className="btn btn-primary btn-full btn-lg"
                  type="submit"
                  disabled={loading || phone.replace(/\D/g, '').length !== 10}
                  style={{ minHeight: 56, fontSize: '1.05rem', fontWeight: 800, borderRadius: 'var(--radius-lg)' }}
                >
                  {loading ? 'भेजा जा रहा है…' : 'OTP भेजें (Send OTP)'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)', textAlign: 'center', fontSize: 'var(--font-size-sm)' }}>
                  +91 {phone} पर भेजा गया कोड दर्ज करें:
                </p>
                <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
                  <label className="input-label" style={{ textAlign: 'center', fontWeight: 700 }}>
                    OTP कोड दर्ज करें
                  </label>
                  <input
                    type="number"
                    className="input"
                    placeholder="••••••"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                    style={{ textAlign: 'center', fontSize: '1.6rem', letterSpacing: '0.35em', minHeight: 56, fontWeight: 800 }}
                    autoFocus
                  />
                </div>

                {error && (
                  <p style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)', textAlign: 'center' }}>
                    {error}
                  </p>
                )}

                <button
                  className="btn btn-primary btn-full btn-lg"
                  type="submit"
                  disabled={loading || !otp}
                  style={{ minHeight: 56, fontSize: '1.05rem', fontWeight: 800, borderRadius: 'var(--radius-lg)' }}
                >
                  {loading ? 'सत्यापित हो रहा है…' : 'सत्यापित करें व लॉगिन (Verify & Sign In)'}
                </button>

                <button
                  type="button"
                  className="btn btn-ghost btn-full"
                  style={{ marginTop: 'var(--space-3)', minHeight: 48, fontWeight: 700 }}
                  onClick={() => setStep('phone')}
                >
                  ← दूसरा नंबर बदलें
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── Mode 2: Quick PIN Login (Returning Users) ───── */}
        {authMode === 'pin' && (
          <form onSubmit={handlePinLogin}>
            <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="input-label" style={{ fontWeight: 700 }}>
                मोबाइल नंबर (Mobile Number)
              </label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <span
                  className="input"
                  style={{
                    width: 68,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-text-muted)',
                    fontWeight: 700,
                    background: '#F8FAFC',
                  }}
                >
                  +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  className="input"
                  placeholder="10 अंकों का नंबर"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  maxLength={10}
                  autoComplete="tel"
                  style={{ fontSize: '1.05rem', fontWeight: 600 }}
                />
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
              <label className="input-label" style={{ fontWeight: 700 }}>
                4-अंकीय सुरक्षा पिन (4-Digit PIN)
              </label>
              <input
                type="password"
                inputMode="numeric"
                className="input"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                style={{ textAlign: 'center', fontSize: '1.6rem', letterSpacing: '0.4em', minHeight: 54, fontWeight: 800 }}
              />
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
                ऑनबोर्डिंग के दौरान सेट किया गया 4-अंकीय PIN
              </p>
            </div>

            {error && (
              <p style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>
                {error}
              </p>
            )}

            <button
              className="btn btn-primary btn-full btn-lg"
              type="submit"
              disabled={loading || phone.replace(/\D/g, '').length !== 10 || pin.length !== 4}
              style={{ minHeight: 56, fontSize: '1.05rem', fontWeight: 800, borderRadius: 'var(--radius-lg)' }}
            >
              {loading ? 'प्रवेश हो रहा है…' : 'PIN से लॉगिन करें (Sign In with PIN)'}
            </button>
          </form>
        )}

        {/* New Member Registration Link */}
        <div style={{ textAlign: 'center', marginTop: 28, borderTop: '1px solid #E2E8F0', paddingTop: 20 }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: 8 }}>
            क्या आपका खाता नहीं है? (New to Time Bank?)
          </p>
          <button
            type="button"
            className="btn btn-outline btn-full"
            style={{ minHeight: 50, fontWeight: 700, borderRadius: 'var(--radius-md)' }}
            onClick={() => navigate('/onboarding')}
          >
            नया सदस्य पंजीकरण (Join / Onboarding)
          </button>
        </div>
      </div>
    </div>
  );
}
