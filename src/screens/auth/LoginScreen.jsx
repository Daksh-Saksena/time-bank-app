import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { DEMO_ACCOUNTS } from '../../data/mockData';
export default function LoginScreen() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('phone');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  function handleSendOtp(e) {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('otp');
    }, 1200);
  }
  function handleVerifyOtp(e) {
    e.preventDefault();
    if (otp !== '1234') {
      setError('Incorrect OTP. (Use 1234 for this demo)');
      return;
    }
    setError('');
    setLoading(true);
    setTimeout(() => {
      login('user-001');
      navigate('/senior/home');
    }, 1000);
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
            <div className="alert alert-info" style={{ marginBottom: 'var(--space-5)' }}>
              This is a prototype. Enter any valid phone number and use OTP <strong>1234</strong> to sign in.
            </div>
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
            <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)', textAlign: 'center', fontSize: 'var(--font-size-sm)' }}>
              Enter the OTP sent to +91 {phone} (Use <strong>1234</strong>)
            </p>
            <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
              <label className="input-label" style={{ textAlign: 'center' }}>One-Time Password</label>
              <input
                type="number"
                className="input"
                placeholder="Enter 4-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.slice(0, 4))}
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
        <div className="divider" style={{ marginTop: 'var(--space-8)' }} />
        <p style={{ textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
          Quick demo access
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.userId}
              className="btn btn-ghost"
              style={{ flex: 1, flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-xs)', padding: 'var(--space-3) var(--space-2)' }}
              onClick={() => { login(a.userId); const r = { senior: '/senior/home', volunteer: '/volunteer/home', admin: '/admin/dashboard' }; navigate(r[a.role]); }}
            >
              <span style={{ fontSize: '1.5rem' }}>{a.emoji}</span>
              <span>{a.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
