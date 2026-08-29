import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const { login, refreshProfile } = useApp();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('phone');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function handleSendOtp(e) {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const cleanDigits = phone.replace(/\D/g, '');
      const fullPhone = phone.startsWith('+') ? phone : `+91${cleanDigits}`;
      
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
        options: {
          shouldCreateUser: true,
          channel: 'sms',
        },
      });

      if (otpErr) {
        console.error('Supabase OTP Error:', otpErr);
        setError(otpErr.message || 'Error sending SMS. Please check your Twilio configuration in Supabase.');
        return;
      }

      setInfo(`OTP sent successfully to ${fullPhone}`);
      setStep('otp');
    } catch (err) {
      console.error('Unexpected OTP Error:', err);
      setError(err.message || 'Failed to send OTP. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      setError('Please enter the OTP code');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const cleanDigits = phone.replace(/\D/g, '');
      const fullPhone = phone.startsWith('+') ? phone : `+91${cleanDigits}`;
      const { data, error: verifyErr } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: otp.trim(),
        type: 'sms',
      });

      if (verifyErr) {
        throw verifyErr;
      }

      if (data?.user) {
        // Fetch or create profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profile) {
          login(profile);
          const routeMap = {
            senior: '/senior/home',
            volunteer: '/volunteer/home',
            admin: '/admin/dashboard',
          };
          navigate(routeMap[profile.role] || '/');
        } else {
          // If user exists in auth but has no profile yet, send to onboarding
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
      <div style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))', padding: 'var(--space-8) var(--space-5) var(--space-10)', textAlign: 'center' }}>
        <button
          onClick={() => navigate('/')}
          style={{ position: 'absolute', left: 'var(--space-4)', top: 'var(--space-4)', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: 'white', fontSize: '1.2rem' }}
        >
          ←
        </button>
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '40px', height: '40px' }} />
        </div>
        <h2 style={{ color: 'white', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Sign In</h2>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 'var(--font-size-sm)' }}>Time Bank of India</p>
      </div>
      <div style={{ padding: 'var(--space-6) var(--space-5)', marginTop: '-var(--space-4)' }}>
        {step === 'phone' ? (
          <form onSubmit={handleSendOtp}>
            <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
              <label className="input-label">Phone Number</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <span className="input" style={{ width: 64, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontWeight: 600 }}>+91</span>
                <input
                  type="tel"
                  className="input"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  autoFocus
                />
              </div>
            </div>
            {error && <p style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>{error}</p>}
            {info && <p style={{ color: 'var(--color-primary)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-3)', background: 'var(--color-surface-alt)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)' }}>{info}</p>}
            <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)', textAlign: 'center', fontSize: 'var(--font-size-sm)' }}>
              Enter the OTP sent to +91 {phone}
            </p>
            <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
              <label className="input-label" style={{ textAlign: 'center' }}>One-Time Password</label>
              <input
                type="number"
                className="input"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                style={{ textAlign: 'center', fontSize: 'var(--font-size-xl)', letterSpacing: '0.3em' }}
                autoFocus
              />
            </div>
            {error && <p style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)', textAlign: 'center' }}>{error}</p>}
            <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>
            <button type="button" className="btn btn-ghost btn-full" style={{ marginTop: 'var(--space-3)' }} onClick={() => setStep('phone')}>
              ← Change Number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
