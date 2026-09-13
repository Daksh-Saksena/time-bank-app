import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { SERVICE_TYPES, SERVICE_LABELS, SERVICE_ICONS, URGENCY, DAYS_OF_WEEK, MAX_ACTIVE_REQUESTS } from '../../constants';
import { Mic, Square, Check, ArrowLeft, Volume2, RepeatIcon } from 'lucide-react';
import { sanitizeText } from '../../lib/sanitize';

export default function RequestHelp() {
  const { createRequest, currentUser, seniorMode, requests } = useApp();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const prefillType = params.get('type') || '';
  const startVoice = params.get('voice') === 'true';

  const [form, setForm] = useState({
    serviceType: prefillType || SERVICE_TYPES.MEDICINE,
    description: '',
    urgency: URGENCY.NORMAL,
    pincode: currentUser?.pincode || '',
    location: currentUser?.area || '',
    audioUrl: null,
  });

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState({
    days: [],
    time: '09:00',
    fromDate: '',
    toDate: '',
  });

  const [sendToTrustedFirst, setSendToTrustedFirst] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submittedResult, setSubmittedResult] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlobUrl, setAudioBlobUrl] = useState(null);
  const [voiceError, setVoiceError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Active request count check
  const myActiveCount = requests.filter(
    (r) => r.seniorId === currentUser?.id &&
      ['open', 'notified_trusted', 'accepted', 'in_progress'].includes(r.status)
  ).length;
  const atLimit = myActiveCount >= MAX_ACTIVE_REQUESTS;

  useEffect(() => {
    if (startVoice) setTimeout(() => startRecording(), 400);
    return () => stopRecording();
  }, []);

  // Read-aloud for description
  function readAloud(text) {
    if (!text || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  async function startRecording() {
    setVoiceError('');
    setRecordingSeconds(0);
    audioChunksRef.current = [];

    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceError('Audio recording not supported. Please type your request.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlobUrl(url);
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          setForm((p) => ({
            ...p,
            audioUrl: reader.result,
            description: p.description || `🎙️ Voice Note (${SERVICE_LABELS[p.serviceType] || 'Help Request'})`,
          }));
        };
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setIsListening(true);
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);

      // Speech-to-text (Hindi + English)
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        const rec = new SR();
        rec.lang = 'hi-IN';
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (event) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
          if (transcript.trim()) setForm((p) => ({ ...p, description: transcript.trim() }));
        };
        recognitionRef.current = rec;
        try { rec.start(); } catch (e) {}
      }
    } catch (err) {
      setVoiceError('Microphone access denied. Please allow microphone permissions.');
    }
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current?.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }

  function formatSecs(secs) {
    const m = Math.floor(secs / 60), s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function toggleDay(day) {
    setRecurrencePattern((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (atLimit) { setSubmitError(`You already have ${MAX_ACTIVE_REQUESTS} active requests. Please wait for one to be completed.`); return; }
    if (isRecurring && recurrencePattern.days.length === 0) { setSubmitError('Please select at least one day for recurring requests.'); return; }
    if (isRecurring && (!recurrencePattern.fromDate || !recurrencePattern.toDate)) { setSubmitError('Please set start and end dates for recurring requests.'); return; }
    setSubmitError('');
    setLoading(true);
    try {
      const result = await createRequest({
        ...form,
        description: sanitizeText(form.description, 500),
        location: sanitizeText(form.location, 200),
        isRecurring,
        recurrencePattern: isRecurring ? recurrencePattern : null,
        sendToTrustedFirst,
      });
      setSubmittedResult(result);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || 'Failed to create request. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    const isRecurringResult = submittedResult?.count > 0;
    return (
      <div className={`page-content no-nav${seniorMode ? ' senior-mode' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 'var(--space-6)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'var(--color-success)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)' }}>
            <Check size={40} />
          </div>
          <h2 style={{ marginBottom: 'var(--space-3)' }}>{t('requestPosted', 'Request Posted!')}</h2>
          {isRecurringResult ? (
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-base)', lineHeight: 1.6 }}>
              🔁 {submittedResult.count} recurring requests created for the selected dates.
            </p>
          ) : (
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-base)', lineHeight: 1.6 }}>
              {sendToTrustedFirst ? '🙏 Sent to your Trusted Circle first. If no response in 15 mins, it will be sent to all volunteers.' : t('requestPublishedMsg', 'Published to community feed.')}
            </p>
          )}
          <button className="btn btn-primary btn-full btn-lg" onClick={() => navigate('/senior/home')}>
            {t('home', 'Back to Home')}
          </button>
          <button className="btn btn-ghost btn-full" style={{ marginTop: 'var(--space-3)' }} onClick={() => navigate('/senior/nearby')}>
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
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-3)' }}
        >
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ color: 'white', fontWeight: 700 }}>{t('requestHelpTitle', 'Request Help')}</h2>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 'var(--font-size-sm)' }}>Fill in your request below</p>
      </div>

      {atLimit && (
        <div className="alert alert-warning" style={{ margin: 'var(--space-4) var(--space-5) 0' }}>
          ⚠️ You have {MAX_ACTIVE_REQUESTS} active requests. Please wait for one to be completed before creating more.
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ padding: 'var(--space-5)', opacity: atLimit ? 0.5 : 1, pointerEvents: atLimit ? 'none' : 'auto' }}>

        {/* Service Type */}
        <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
          <label className="input-label">{t('helpNeededType', 'Type of Help Needed')}</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
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
                  cursor: 'pointer', fontFamily: 'var(--font-family)', fontWeight: 600,
                  fontSize: 'var(--font-size-sm)',
                  color: form.serviceType === type ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  minHeight: 'var(--touch-min)', display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.15s',
                }}
              >
                <span>{SERVICE_ICONS[type]}</span>
                <span>{SERVICE_LABELS[type]?.split(' ')[0] || type}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Description with Voice */}
        <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="flex justify-between items-center mb-2">
            <label className="input-label">{t('describeNeed', 'Describe your need')}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {form.description && (
                <button
                  type="button"
                  onClick={() => readAloud(form.description)}
                  style={{ background: 'var(--color-surface-alt)', border: 'none', borderRadius: 'var(--radius-full)', padding: '6px 12px', cursor: 'pointer', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Volume2 size={14} /> Read
                </button>
              )}
              <button
                type="button"
                onClick={() => isListening ? stopRecording() : startRecording()}
                style={{
                  background: isListening ? '#E74C3C' : 'var(--color-primary)',
                  border: 'none', borderRadius: 'var(--radius-full)', padding: '6px 14px',
                  cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'white',
                  fontFamily: 'var(--font-family)', display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: isListening ? '0 0 12px rgba(231,76,60,0.7)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {isListening ? <Square size={16} /> : <Mic size={16} />}
                <span>{isListening ? `Stop (${formatSecs(recordingSeconds)})` : '🎙️ Speak'}</span>
              </button>
            </div>
          </div>

          <textarea
            className="input"
            placeholder="e.g. Mujhe kal subah medicine chahiye — dawaai ka naam: Paracetamol 500mg"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={4}
          />

          {isListening && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#E74C3C', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginTop: 8, background: 'rgba(231,76,60,0.1)', padding: '8px 12px', borderRadius: 'var(--radius-md)' }}>
              <span style={{ animation: 'pulse 1s infinite' }}>●</span>
              Recording ({formatSecs(recordingSeconds)}) — बोलिए!
            </div>
          )}
          {audioBlobUrl && !isListening && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, background: 'var(--color-surface-alt)', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <Volume2 size={16} color="var(--color-primary)" />
              <audio src={audioBlobUrl} controls style={{ height: 32, flex: 1 }} />
            </div>
          )}
          {voiceError && <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)', marginTop: 6 }}>{voiceError}</p>}
        </div>

        {/* One-Time vs Recurring Toggle */}
        <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
          <label className="input-label">Request Type</label>
          <div style={{ display: 'flex', gap: 8, background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-lg)', padding: 4 }}>
            {[
              { key: false, label: '📅 One Time', icon: null },
              { key: true, label: '🔁 Recurring', icon: <RepeatIcon size={14} /> },
            ].map(({ key, label, icon }) => (
              <button
                key={String(key)}
                type="button"
                onClick={() => setIsRecurring(key)}
                style={{
                  flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-family)', fontWeight: isRecurring === key ? 700 : 500,
                  background: isRecurring === key ? 'white' : 'transparent',
                  color: isRecurring === key ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  fontSize: 'var(--font-size-sm)',
                  boxShadow: isRecurring === key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s',
                }}
              >{label}</button>
            ))}
          </div>
        </div>

        {/* Recurring Pattern */}
        {isRecurring && (
          <div className="card" style={{ marginBottom: 'var(--space-5)', border: '2px solid var(--color-primary)' }}>
            <h4 style={{ marginBottom: 'var(--space-4)', color: 'var(--color-primary)' }}>🔁 Recurring Schedule</h4>

            {/* Day selection */}
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label className="input-label">Days of Week</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {DAYS_OF_WEEK.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleDay(key)}
                    style={{
                      padding: '8px 14px', borderRadius: 'var(--radius-full)',
                      border: `2px solid ${recurrencePattern.days.includes(key) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: recurrencePattern.days.includes(key) ? 'var(--color-primary)' : 'white',
                      color: recurrencePattern.days.includes(key) ? 'white' : 'var(--color-text-secondary)',
                      cursor: 'pointer', fontFamily: 'var(--font-family)', fontWeight: 600,
                      fontSize: 'var(--font-size-sm)', transition: 'all 0.15s',
                    }}
                  >{label}</button>
                ))}
              </div>
            </div>

            {/* Time */}
            <div className="input-group" style={{ marginBottom: 'var(--space-3)' }}>
              <label className="input-label">Time</label>
              <input
                className="input"
                type="time"
                value={recurrencePattern.time}
                onChange={(e) => setRecurrencePattern((p) => ({ ...p, time: e.target.value }))}
              />
            </div>

            {/* Date range */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">From Date</label>
                <input
                  className="input"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={recurrencePattern.fromDate}
                  onChange={(e) => setRecurrencePattern((p) => ({ ...p, fromDate: e.target.value }))}
                />
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">To Date</label>
                <input
                  className="input"
                  type="date"
                  min={recurrencePattern.fromDate || new Date().toISOString().split('T')[0]}
                  value={recurrencePattern.toDate}
                  onChange={(e) => setRecurrencePattern((p) => ({ ...p, toDate: e.target.value }))}
                />
              </div>
            </div>

            {recurrencePattern.days.length > 0 && recurrencePattern.fromDate && recurrencePattern.toDate && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                📅 Every {recurrencePattern.days.join(', ')} at {recurrencePattern.time} from {recurrencePattern.fromDate} to {recurrencePattern.toDate}
              </div>
            )}
          </div>
        )}

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
                  flex: 1, padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                  border: `2px solid ${form.urgency === value ? (value === URGENCY.HIGH ? 'var(--color-danger)' : 'var(--color-success)') : 'var(--color-border)'}`,
                  background: form.urgency === value ? (value === URGENCY.HIGH ? 'var(--color-danger-bg)' : 'var(--color-success-bg)') : 'white',
                  cursor: 'pointer', fontFamily: 'var(--font-family)', fontWeight: 600, fontSize: 'var(--font-size-sm)', minHeight: 'var(--touch-min)',
                }}
              >
                <div>{label}</div>
                <div style={{ fontWeight: 400, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
          <label className="input-label">{t('locationLandmark', 'Location / Landmark')}</label>
          <input
            className="input"
            placeholder="e.g. Near Community Center, Apartment 4B"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
          />
        </div>

        {/* Trusted Circle option */}
        <div
          onClick={() => setSendToTrustedFirst(!sendToTrustedFirst)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
            border: `2px solid ${sendToTrustedFirst ? 'var(--color-primary)' : 'var(--color-border)'}`,
            background: sendToTrustedFirst ? '#EBF5FB' : 'white',
            cursor: 'pointer', marginBottom: 'var(--space-5)',
          }}
        >
          <div style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${sendToTrustedFirst ? 'var(--color-primary)' : 'var(--color-border)'}`, background: sendToTrustedFirst ? 'var(--color-primary)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {sendToTrustedFirst && <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>✓</span>}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: sendToTrustedFirst ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
              🙏 Send to Trusted Circle first
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
              Your preferred helpers get notified first (15 min window)
            </div>
          </div>
        </div>

        {submitError && (
          <div className="alert alert-warning" style={{ marginBottom: 'var(--space-4)' }}>{submitError}</div>
        )}

        <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading || !form.description || !form.location}>
          {loading ? 'Posting…' : isRecurring ? '🔁 Create Recurring Requests' : t('postRequest', 'Post Request')}
        </button>
        <button type="button" className="btn btn-ghost btn-full" style={{ marginTop: 'var(--space-3)' }} onClick={() => navigate(-1)}>
          {t('cancel', 'Cancel')}
        </button>
      </form>
    </div>
  );
}
