import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
export default function WelcomeScreen() {
  const navigate = useNavigate();
  const { login } = useApp();
  return (
    <div className="page-content no-nav" style={{ background: 'linear-gradient(160deg, #1B4F72 0%, #2E86AB 60%, #1B4F72 100%)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-8) var(--space-6)', textAlign: 'center' }}>
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '80px', height: '80px' }} />
        </div>
        <h1 style={{ color: 'white', fontWeight: 800, fontSize: '2rem', marginBottom: 'var(--space-2)', lineHeight: 1.2 }}>
          Time Bank of India
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 'var(--font-size-base)', maxWidth: 300, lineHeight: 1.6 }}>
          A community where time is currency. Help others, earn time, and let the community support you.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-6)', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[{ label: '1,200+', sub: 'Members' }, { label: '4,800h', sub: 'Volunteered' }, { label: '38 Pincodes', sub: 'Covered' }].map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'white' }}>{s.label}</div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'rgba(255,255,255,0.7)' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: 'white', borderRadius: '24px 24px 0 0', padding: 'var(--space-6) var(--space-5)', paddingBottom: 'max(var(--space-8), env(safe-area-inset-bottom))' }}>
        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Welcome back</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-5)' }}>
          Sign in or register to continue
        </p>
        <button className="btn btn-primary btn-full btn-lg" onClick={() => navigate('/login')} style={{ marginBottom: 'var(--space-3)' }}>
          Sign In with Phone / Aadhaar
        </button>
        <button className="btn btn-outline btn-full" onClick={() => navigate('/onboarding')} style={{ marginBottom: 'var(--space-6)' }}>
          Create Account
        </button>
      </div>
    </div>
  );
}
