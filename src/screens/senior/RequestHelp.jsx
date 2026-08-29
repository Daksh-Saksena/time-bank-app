import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { SERVICE_TYPES, SERVICE_LABELS, SERVICE_ICONS, URGENCY } from '../../constants';
import { Mic, MicOff, Check, ArrowLeft } from 'lucide-react';

export default function RequestHelp() {
  const { createRequest, currentUser, seniorMode } = useApp();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const prefillType = params.get('type') || '';
  const startVoice = params.get('voice') === 'true';

  const [form, setForm] = useState({
    serviceType: prefillType || SERVICE_TYPES.OTHER,
    description: '',
    urgency: URGENCY.NORMAL,
    pincode: currentUser?.pincode || '',
    location: currentUser?.area || '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    console.log('%c[Voice Debug] SpeechRecognition API available:', 'color: #3498db; font-weight: bold', !!SpeechRecognition);

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = 'en-IN';
      rec.continuous = true;
      rec.interimResults = true;

      rec.onstart = () => {
        console.log('%c[Voice Debug] Speech recognition STARTED listening', 'color: #2ecc71; font-weight: bold');
        setIsListening(true);
        isListeningRef.current = true;
        setVoiceError('');
      };

      rec.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        console.log('%c[Voice Debug] Speech recognition RESULT:', 'color: #f39c12; font-weight: bold', transcript);
        if (transcript.trim()) {
          setForm((prev) => ({
            ...prev,
            description: transcript.trim(),
          }));
        }
      };

      rec.onerror = (event) => {
        console.warn('%c[Voice Debug] Speech recognition ERROR:', 'color: #e74c3c; font-weight: bold', event.error, event);
        if (event.error === 'not-allowed') {
          setVoiceError('Microphone access blocked. Please allow microphone permissions in your browser.');
          setIsListening(false);
          isListeningRef.current = false;
        } else if (event.error === 'no-speech') {
          console.log('[Voice Debug] No speech detected yet, continuing...');
        } else if (event.error === 'network') {
          setVoiceError('Speech recognition service unreachable. You can type your request directly.');
          setIsListening(false);
          isListeningRef.current = false;
        } else {
          setVoiceError(`Voice note: ${event.error}`);
        }
      };

      rec.onend = () => {
        console.log('%c[Voice Debug] Speech recognition ENDED', 'color: #95a5a6; font-weight: bold', { isListening: isListeningRef.current });
        if (isListeningRef.current) {
          try {
            console.log('[Voice Debug] Restarting recognition stream...');
            rec.start();
          } catch (e) {
            console.warn('[Voice Debug] Restart failed:', e);
            setIsListening(false);
            isListeningRef.current = false;
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = rec;
    } else {
      setVoiceError('Voice speech recognition is not supported in this browser. Please type your request.');
    }

    if (startVoice) {
      console.log('[Voice Debug] startVoice query param detected, attempting auto-start...');
      setTimeout(() => {
        startListeningSession();
      }, 500);
    }

    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  function startListeningSession() {
    setVoiceError('');
    console.log('%c[Voice Debug] startListeningSession called', 'color: #3498db; font-weight: bold');
    if (!recognitionRef.current) {
      setVoiceError('Voice recognition is not supported in this browser. Please type your request.');
      return;
    }

    try {
      isListeningRef.current = true;
      recognitionRef.current.start();
      setIsListening(true);
      console.log('[Voice Debug] rec.start() executed successfully');
    } catch (err) {
      console.warn('[Voice Debug] rec.start() throw exception:', err);
      try {
        recognitionRef.current.stop();
        setTimeout(() => {
          if (isListeningRef.current) {
            recognitionRef.current.start();
            setIsListening(true);
          }
        }, 150);
      } catch (e) {}
    }
  }

  function stopListeningSession() {
    console.log('%c[Voice Debug] stopListeningSession called', 'color: #e74c3c; font-weight: bold');
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
  }

  function toggleVoice() {
    if (isListening) {
      stopListeningSession();
    } else {
      startListeningSession();
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    console.log('%c[Request Form Submit]', 'color: #8e44ad; font-weight: bold', form);
    await createRequest(form);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div
        className={`page-content no-nav${seniorMode ? ' senior-mode' : ''}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: 'var(--space-6)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 70,
              height: 70,
              borderRadius: '50%',
              background: 'var(--color-success)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-4)',
            }}
          >
            <Check size={40} />
          </div>
          <h2 style={{ marginBottom: 'var(--space-3)' }}>
            {t('requestPosted', 'Request Posted!')}
          </h2>
          <p
            style={{
              color: 'var(--color-text-muted)',
              marginBottom: 'var(--space-6)',
              fontSize: 'var(--font-size-base)',
              lineHeight: 1.6,
            }}
          >
            {t('requestPublishedMsg', 'Your request has been published to the community feed. Volunteers in your pincode can now see and accept it.')}
          </p>
          <button className="btn btn-primary btn-full btn-lg" onClick={() => navigate('/senior/home')}>
            {t('home', 'Back to Home')}
          </button>
          <button
            className="btn btn-ghost btn-full"
            style={{ marginTop: 'var(--space-3)' }}
            onClick={() => navigate('/senior/nearby')}
          >
            {t('myRequests', 'See My Requests')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`page-content no-nav${seniorMode ? ' senior-mode' : ''}`}>
      <div style={{ background: 'var(--color-primary)', padding: 'var(--space-5)' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '50%',
            width: 36,
            height: 36,
            cursor: 'pointer',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--space-3)',
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ color: 'white', fontWeight: 700 }}>{t('requestHelpTitle', 'Request Help')}</h2>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 'var(--font-size-sm)' }}>
          {t('tapButtonHelp', 'Fill in your request below')}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: 'var(--space-5)' }}>
        {/* Service type */}
        <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
          <label className="input-label">{t('helpNeededType', 'Type of Help Needed')}</label>
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
                <span>{t(type, SERVICE_LABELS[type]?.split(' ')[0] || type)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Description with Voice Input */}
        <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="flex justify-between items-center mb-2">
            <label className="input-label">{t('describeNeed', 'Describe your need')}</label>
            <button
              type="button"
              onClick={toggleVoice}
              style={{
                background: isListening ? '#E74C3C' : 'var(--color-primary)',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                padding: '6px 14px',
                cursor: 'pointer',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 600,
                color: 'white',
                fontFamily: 'var(--font-family)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: isListening ? '0 0 10px rgba(231,76,60,0.6)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              <span>{isListening ? t('stopRecording', 'Stop Recording') : t('speakMic', 'Speak / Mic')}</span>
            </button>
          </div>

          <textarea
            className="input"
            placeholder="e.g. I need someone to help me buy groceries or visit the bank..."
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={4}
          />

          {isListening && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                color: '#E74C3C',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 600,
                marginTop: 'var(--space-2)',
              }}
            >
              <span style={{ animation: 'pulse 1s infinite', display: 'inline-block' }}>●</span>
              {t('recordingVoice', 'Recording your voice… speak clearly')}
            </div>
          )}

          {voiceError && (
            <p
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-danger)',
                marginTop: 6,
                background: 'var(--color-danger-bg)',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {voiceError}
            </p>
          )}
        </div>

        {/* Urgency */}
        <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
          <label className="input-label">{t('urgency', 'Urgency')}</label>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            {[
              { value: URGENCY.NORMAL, label: t('normal', 'Normal'), desc: t('flexibleTiming', 'Flexible timing') },
              { value: URGENCY.HIGH, label: t('urgent', 'Urgent'), desc: t('needHelpAsap', 'Need help ASAP') },
            ].map(({ value, label, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, urgency: value }))}
                style={{
                  flex: 1,
                  padding: 'var(--space-3)',
                  border: `2px solid ${
                    form.urgency === value
                      ? value === URGENCY.HIGH
                        ? 'var(--color-danger)'
                        : 'var(--color-success)'
                      : 'var(--color-border)'
                  }`,
                  borderRadius: 'var(--radius-md)',
                  background:
                    form.urgency === value
                      ? value === URGENCY.HIGH
                        ? 'var(--color-danger-bg)'
                        : 'var(--color-success-bg)'
                      : 'white',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-family)',
                  fontWeight: 600,
                  fontSize: 'var(--font-size-sm)',
                  minHeight: 'var(--touch-min)',
                }}
              >
                <div>{label}</div>
                <div style={{ fontWeight: 400, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
          <label className="input-label">{t('locationLandmark', 'Location / Landmark')}</label>
          <input
            className="input"
            placeholder="e.g. Near Community Center, Apartment 4B"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
          />
        </div>

        <div className="input-group" style={{ marginBottom: 'var(--space-6)' }}>
          <label className="input-label">{t('yourPincode', 'Pincode')}</label>
          <input
            className="input"
            type="number"
            placeholder="6-digit pincode"
            value={form.pincode}
            onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value.slice(0, 6) }))}
          />
        </div>

        <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={!form.description || !form.location}>
          {t('postRequest', 'Post Request')}
        </button>
        <button type="button" className="btn btn-ghost btn-full" style={{ marginTop: 'var(--space-3)' }} onClick={() => navigate(-1)}>
          {t('cancel', 'Cancel')}
        </button>
      </form>
    </div>
  );
}
