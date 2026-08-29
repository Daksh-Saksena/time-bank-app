import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { SERVICE_TYPES, SERVICE_LABELS, SERVICE_ICONS, URGENCY } from '../../constants';
export default function RequestHelp() {
  const { createRequest, currentUser, seniorMode } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const prefillType = params.get('type') || '';
  const startVoice = params.get('voice') === 'true';
  const [form, setForm] = useState({
    serviceType: prefillType || SERVICE_TYPES.OTHER,
    description: '',
    urgency: URGENCY.NORMAL,
    pincode: currentUser?.pincode || '400001',
    location: currentUser?.area || '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef(null);
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognition);
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = 'en-IN';
      rec.continuous = false;
      rec.interimResults = true;
      rec.onresult = (e) => {
        const transcript = Array.from(e.results)
          .map((r) => r[0].transcript)
          .join('');
        setForm((prev) => ({ ...prev, description: transcript }));
      };
      rec.onend = () => setIsListening(false);
      rec.onerror = () => setIsListening(false);
      recognitionRef.current = rec;
    }
    if (startVoice) {
      setTimeout(() => toggleVoice(), 500);
    }
  }, []);
  function toggleVoice() {
    if (!recognitionRef.current) {
      setIsListening(true);
      setTimeout(() => {
        setForm((prev) => ({ ...prev, description: 'I need someone to pick up my blood pressure medicines from the pharmacy near Colaba market.' }));
        setIsListening(false);
      }, 2000);
      return;
    }
    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (err) {}
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Speech recognition start note:', err);
      }
    }
  }
  function handleSubmit(e) {
    e.preventDefault();
    createRequest(form);
    setSubmitted(true);
  }
  if (submitted) {
    return (
      <div className={`page-content no-nav${seniorMode ? ' senior-mode' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 'var(--space-6)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>✓</div>
          <h2 style={{ marginBottom: 'var(--space-3)' }}>Request Posted!</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)', fontSize: 'var(--font-size-base)', lineHeight: 1.6 }}>
            Your request has been published to the community feed. Volunteers in your pincode can now see and accept it.
          </p>
          <button className="btn btn-primary btn-full btn-lg" onClick={() => navigate('/senior/home')}>
            Back to Home
          </button>
          <button className="btn btn-ghost btn-full" style={{ marginTop: 'var(--space-3)' }} onClick={() => navigate('/senior/nearby')}>
            See My Requests
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className={`page-content no-nav${seniorMode ? ' senior-mode' : ''}`}>
      <div style={{ background: 'var(--color-primary)', padding: 'var(--space-5)' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: 'white', fontSize: '1.2rem', marginBottom: 'var(--space-3)' }}>←</button>
        <h2 style={{ color: 'white', fontWeight: 700 }}>Request Help</h2>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 'var(--font-size-sm)' }}>Fill in your request below</p>
      </div>
      <form onSubmit={handleSubmit} style={{ padding: 'var(--space-5)' }}>
        {/* Service type */}
        <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
          <label className="input-label">Type of Help Needed</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            {Object.values(SERVICE_TYPES).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setForm((f) => ({ ...f, serviceType: type }))}
                style={{
                  padding: 'var(--space-3) var(--space-4)',
                  border: `2px solid ${form.serviceType === type ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  background: form.serviceType === type ? '#EBF5FB' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  fontFamily: 'var(--font-family)',
                  fontWeight: 600,
                  fontSize: 'var(--font-size-sm)',
                  color: form.serviceType === type ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  minHeight: 'var(--touch-min)',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '1.3rem' }}>{SERVICE_ICONS[type]}</span>
                <span>{SERVICE_LABELS[type].split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
        {/* Description with voice */}
        <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="flex justify-between items-center mb-2">
            <label className="input-label">Describe your need</label>
            <button
              type="button"
              onClick={toggleVoice}
              style={{
                background: isListening ? 'var(--color-danger)' : 'var(--color-surface-alt)',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                padding: '6px 14px',
                cursor: 'pointer',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 600,
                color: isListening ? 'white' : 'var(--color-text-secondary)',
                fontFamily: 'var(--font-family)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                animation: isListening ? 'pulse 1s infinite' : 'none',
              }}
            >
              {isListening ? 'Listening…' : 'Speak'}
            </button>
          </div>
          <textarea
            className="input"
            placeholder="e.g. I need someone to pick up my blood pressure medicines from the pharmacy near Colaba market."
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={4}
          />
          {isListening && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)' }}>
              <span style={{ animation: 'pulse 1s infinite', display: 'inline-block' }}>●</span>
              Listening - speak clearly…
            </div>
          )}
          {!voiceSupported && (
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
              Voice input not supported in this browser. Please type your request.
            </p>
          )}
        </div>
        {/* Urgency */}
        <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
          <label className="input-label">Urgency</label>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            {[
              { value: URGENCY.NORMAL, label: ' Normal', desc: 'Flexible timing' },
              { value: URGENCY.HIGH, label: ' Urgent', desc: 'Need help ASAP' },
            ].map(({ value, label, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, urgency: value }))}
                style={{
                  flex: 1,
                  padding: 'var(--space-3)',
                  border: `2px solid ${form.urgency === value ? (value === URGENCY.HIGH ? 'var(--color-danger)' : 'var(--color-success)') : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  background: form.urgency === value ? (value === URGENCY.HIGH ? 'var(--color-danger-bg)' : 'var(--color-success-bg)') : 'white',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-family)',
                  fontWeight: 600,
                  fontSize: 'var(--font-size-sm)',
                  minHeight: 'var(--touch-min)',
                }}
              >
                <div>{label}</div>
                <div style={{ fontWeight: 400, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>{desc}</div>
              </button>
            ))}
          </div>
        </div>
        {/* Location */}
        <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
          <label className="input-label">Location / Landmark</label>
          <input className="input" placeholder="e.g. Near Colaba Market" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
        </div>
        <div className="input-group" style={{ marginBottom: 'var(--space-6)' }}>
          <label className="input-label">Pincode</label>
          <input className="input" type="number" value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value.slice(0, 6) }))} />
        </div>
        <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={!form.description || !form.location}>
          Post Request
        </button>
        <button type="button" className="btn btn-ghost btn-full" style={{ marginTop: 'var(--space-3)' }} onClick={() => navigate(-1)}>
          Cancel
        </button>
      </form>
    </div>
  );
}
