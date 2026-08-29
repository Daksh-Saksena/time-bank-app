import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { SERVICE_TYPES, SERVICE_LABELS, SERVICE_ICONS, URGENCY } from '../../constants';
import { Mic, MicOff, Check, ArrowLeft, Play, Square, Volume2 } from 'lucide-react';

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
    audioUrl: null,
  });

  const [submitted, setSubmitted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlobUrl, setAudioBlobUrl] = useState(null);
  const [voiceError, setVoiceError] = useState('');

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const hasTranscribedRef = useRef(false);

  useEffect(() => {
    if (startVoice) {
      setTimeout(() => {
        startRecording();
      }, 400);
    }

    return () => {
      stopRecording();
    };
  }, []);

  async function startRecording() {
    setVoiceError('');
    setRecordingSeconds(0);
    hasTranscribedRef.current = false;
    audioChunksRef.current = [];

    // Step 1: Initialize MediaStream and MediaRecorder (Works in Opera, Brave, Chrome, Safari, Firefox)
    let stream = null;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        console.log('%c[Voice Debug] Requesting microphone stream for MediaRecorder...', 'color: #3498db; font-weight: bold');
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('%c[Voice Debug] Mic stream acquired!', 'color: #2ecc71; font-weight: bold');

        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(audioBlob);
          setAudioBlobUrl(url);
          console.log('%c[Voice Debug] Audio recording completed:', 'color: #2ecc71; font-weight: bold', url);

          // Convert to Base64 for Supabase persistence
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64Audio = reader.result;
            setForm((prev) => ({
              ...prev,
              audioUrl: base64Audio,
              description: prev.description
                ? prev.description
                : `🎙️ Voice Note Recorded (${SERVICE_LABELS[prev.serviceType] || 'Help Request'})`,
            }));
          };

          // Stop all audio tracks
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
          }
        };

        mediaRecorder.start();
        setIsListening(true);

        // Start timer
        timerRef.current = setInterval(() => {
          setRecordingSeconds((s) => s + 1);
        }, 1000);
      } catch (err) {
        console.warn('%c[Voice Debug] Mic access error:', 'color: #e74c3c; font-weight: bold', err);
        setVoiceError('Microphone access was denied. Please allow microphone permissions in your browser.');
        return;
      }
    } else {
      setVoiceError('Audio recording is not supported in this browser. Please type your request.');
      return;
    }

    // Step 2: Try Web Speech API in parallel (For Chrome, Safari, Edge text transcription)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const rec = new SpeechRecognition();
        rec.lang = navigator.language || 'en-IN';
        rec.continuous = true;
        rec.interimResults = true;

        rec.onresult = (event) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript.trim()) {
            hasTranscribedRef.current = true;
            console.log('%c[Voice Debug] Realtime transcript:', 'color: #f39c12; font-weight: bold', transcript);
            setForm((prev) => ({
              ...prev,
              description: transcript.trim(),
            }));
          }
        };

        rec.onerror = (e) => {
          console.warn('[Voice Debug] Speech engine note (MediaRecorder still active):', e.error);
        };

        recognitionRef.current = rec;
        rec.start();
      } catch (e) {
        console.log('[Voice Debug] Native speech recognition skipped, using universal MediaRecorder');
      }
    }
  }

  function stopRecording() {
    console.log('%c[Voice Debug] Stopping recording...', 'color: #e74c3c; font-weight: bold');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    setIsListening(false);
  }

  function toggleVoice() {
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    console.log('%c[Request Form Submit]', 'color: #8e44ad; font-weight: bold', form);
    await createRequest(form);
    setSubmitted(true);
  }

  function formatSecs(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
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

        {/* Description with Universal Voice / Audio Recorder */}
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
                boxShadow: isListening ? '0 0 12px rgba(231,76,60,0.7)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {isListening ? <Square size={16} /> : <Mic size={16} />}
              <span>{isListening ? `Stop (${formatSecs(recordingSeconds)})` : 'Speak / Record'}</span>
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
                background: 'rgba(231, 76, 60, 0.1)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <span style={{ animation: 'pulse 1s infinite', display: 'inline-block', color: '#E74C3C' }}>●</span>
              <span>Recording your voice ({formatSecs(recordingSeconds)}) — speak now!</span>
            </div>
          )}

          {audioBlobUrl && !isListening && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                marginTop: 'var(--space-2)',
                background: 'var(--color-surface-alt)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}
            >
              <Volume2 size={18} color="var(--color-primary)" />
              <audio src={audioBlobUrl} controls style={{ height: 32, flex: 1 }} />
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
