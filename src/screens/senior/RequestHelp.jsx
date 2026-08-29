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

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = 'en-IN';
      rec.continuous = true;
      rec.interimResults = true;

      rec.onstart = () => {
        setIsListening(true);
        setVoiceError('');
      };

      rec.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript.trim()) {
          setForm((prev) => ({
            ...prev,
            description: prev.description
              ? `${prev.description.trim()} ${finalTranscript.trim()}`
              : finalTranscript.trim(),
          }));
        }
      };

      rec.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setVoiceError('Microphone permission blocked. Please allow microphone access.');
        } else if (event.error === 'no-speech') {
          setVoiceError('No speech detected. Tap Speak and speak into your mic.');
        } else {
          setVoiceError(`Voice notice: ${event.error}`);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }

    if (startVoice) {
      setTimeout(() => startListeningSession(), 600);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  async function startListeningSession() {
    setVoiceError('');

    // Explicitly ask for microphone permission if supported
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Release stream immediately so SpeechRecognition can use it
        stream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        setVoiceError('Microphone access was denied. Please allow mic access in your browser.');
        return;
      }
    }

    if (!recognitionRef.current) {
      // Fallback for browsers with no Web Speech API
      setIsListening(true);
      setVoiceError('Live speech recognition not natively supported in this browser. Added sample text.');
      setTimeout(() => {
        setForm((prev) => ({
          ...prev,
          description: prev.description || 'I need help picking up my prescription medicines from the nearby pharmacy.',
        }));
        setIsListening(false);
      }, 1500);
      return;
    }

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      console.warn('Speech recognition start note:', err);
      try {
        recognitionRef.current.stop();
        setTimeout(() => {
          recognitionRef.current.start();
          setIsListening(true);
        }, 200);
      } catch (e) {}
    }
  }

  function stopListeningSession() {
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

  function handleSubmit(e) {
    e.preventDefault();
    createRequest(form);
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

          {/* Quick preset chips for instant 1-tap request */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
            {[
              '💊 Pick up BP medicine from pharmacy',
              '🛒 Buy milk, bread and vegetables',
              '🏦 Help updating bank passbook',
              '🚶 Companion for 30m park walk',
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setForm((f) => ({ ...f, description: preset.slice(3) }))}
                style={{
                  background: 'var(--color-surface-alt)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-full)',
                  padding: '4px 10px',
                  fontSize: '11px',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {preset}
              </button>
            ))}
          </div>

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
