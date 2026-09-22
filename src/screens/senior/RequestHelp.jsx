import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  SERVICE_TYPES,
  SERVICE_LABELS,
  SERVICE_ICONS,
  URGENCY,
  DAYS_OF_WEEK,
  MAX_ACTIVE_REQUESTS,
  REQUEST_STATUS,
} from '../../constants';
import {
  Mic,
  Square,
  Check,
  ArrowLeft,
  ArrowRight,
  Volume2,
  RepeatIcon,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { sanitizeText } from '../../lib/sanitize';

const BILINGUAL_SERVICES = [
  { type: SERVICE_TYPES.MEDICINE, icon: '💊', hi: 'दवाइयाँ लाना', en: 'Medicine Delivery' },
  { type: SERVICE_TYPES.GROCERY, icon: '🛒', hi: 'किराना व सब्ज़ी', en: 'Grocery & Supplies' },
  { type: SERVICE_TYPES.HOSPITAL, icon: '🏥', hi: 'डॉक्टर व अस्पताल संग', en: 'Hospital / Clinic Visit' },
  { type: SERVICE_TYPES.TECH, icon: '📱', hi: 'फ़ोन / डिजिटल मदद', en: 'Phone & Tech Help' },
  { type: SERVICE_TYPES.COMPANIONSHIP, icon: '☕', hi: 'बातचीत व संगति', en: 'Friendly Companionship' },
  { type: SERVICE_TYPES.WALK, icon: '🚶', hi: 'टहलने में साथ', en: 'Walking Companion' },
  { type: SERVICE_TYPES.GOVT_WORK, icon: '🏛️', hi: 'सरकारी कागज़ात', en: 'Form & Govt Paperwork' },
  { type: SERVICE_TYPES.READING, icon: '📖', hi: 'अख़बार / पुस्तक पढ़ना', en: 'Reading & Writing' },
  { type: SERVICE_TYPES.OTHER, icon: '🤝', hi: 'अन्य सेवा', en: 'Other Community Seva' },
];

export default function RequestHelp() {
  const { createRequest, currentUser, seniorMode, requests, getTrustedCircle } = useApp();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const prefillType = params.get('type') || '';
  const startVoiceParam = params.get('voice') === 'true';

  // Step state: 1 = Service, 2 = When/Schedule, 3 = Details & Location, 4 = Helpers & Review
  const [step, setStep] = useState(startVoiceParam ? 3 : 1);

  // Form fields
  const todayStr = new Date().toISOString().split('T')[0];
  const defaultTime = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    const h = String(d.getHours()).padStart(2, '0');
    return `${h}:00`;
  };

  const [form, setForm] = useState({
    serviceType: prefillType || SERVICE_TYPES.MEDICINE,
    description: '',
    urgency: URGENCY.NORMAL,
    pincode: currentUser?.pincode || '',
    location: currentUser?.area || '',
    audioUrl: null,
    scheduledDate: todayStr,
    scheduledTime: defaultTime(),
  });

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState({
    days: ['Mon', 'Wed', 'Fri'],
    time: '09:00',
    fromDate: todayStr,
    toDate: '',
  });

  const [sendToTrustedFirst, setSendToTrustedFirst] = useState(true);
  const [trustedCount, setTrustedCount] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submittedResult, setSubmittedResult] = useState(null);

  // Voice recording & STT
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

  // Active request count limit check
  const myActiveCount = requests.filter(
    (r) =>
      r.seniorId === currentUser?.id &&
      [REQUEST_STATUS.OPEN, REQUEST_STATUS.NOTIFIED_TRUSTED, REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.IN_PROGRESS].includes(r.status)
  ).length;
  const atLimit = myActiveCount >= MAX_ACTIVE_REQUESTS;

  useEffect(() => {
    if (startVoiceParam) {
      setTimeout(() => startRecording(), 400);
    }
    return () => stopRecording();
  }, [startVoiceParam]);

  useEffect(() => {
    if (getTrustedCircle) {
      getTrustedCircle().then((circle) => {
        if (Array.isArray(circle)) setTrustedCount(circle.length);
      }).catch(() => {});
    }
  }, [getTrustedCircle]);

  // Read-aloud text in Hindi/English
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
      setVoiceError('Audio recording not supported on this browser. Please type your request.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
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
            description: p.description || `🎙️ बोलकर बताया गया अनुरोध (${SERVICE_LABELS[p.serviceType] || 'मदद'})`,
          }));
        };
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setIsListening(true);
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);

      // Web Speech Recognition
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
        try {
          rec.start();
        } catch (e) {}
      }
    } catch (err) {
      setVoiceError('Microphone access denied. Please allow microphone permissions in your browser.');
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current?.state !== 'inactive') {
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

  function formatSecs(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function toggleDay(day) {
    setRecurrencePattern((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day],
    }));
  }

  function setQuickSchedule(type) {
    const now = new Date();
    if (type === 'urgent') {
      setForm((f) => ({
        ...f,
        urgency: URGENCY.HIGH,
        scheduledDate: todayStr,
        scheduledTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      }));
    } else if (type === 'evening') {
      setForm((f) => ({
        ...f,
        urgency: URGENCY.NORMAL,
        scheduledDate: todayStr,
        scheduledTime: '18:00',
      }));
    } else if (type === 'tomorrow_morning') {
      const tom = new Date();
      tom.setDate(tom.getDate() + 1);
      setForm((f) => ({
        ...f,
        urgency: URGENCY.NORMAL,
        scheduledDate: tom.toISOString().split('T')[0],
        scheduledTime: '09:30',
      }));
    }
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (atLimit) {
      setSubmitError(`आपकी पहले से ${MAX_ACTIVE_REQUESTS} सेवाएँ सक्रिय हैं। कृपया एक पूरी होने तक प्रतीक्षा करें।`);
      return;
    }
    if (!form.description.trim()) {
      setSubmitError('कृपया अपनी ज़रूरत का विवरण भरें या बोलकर रिकॉर्ड करें।');
      setStep(3);
      return;
    }
    if (!form.location.trim()) {
      setSubmitError('कृपया अपना पता या लैंडमार्क दर्ज करें।');
      setStep(3);
      return;
    }
    if (isRecurring && recurrencePattern.days.length === 0) {
      setSubmitError('कृपया बार-बार सेवा के लिए कम से कम एक दिन चुनें।');
      setStep(2);
      return;
    }
    if (isRecurring && (!recurrencePattern.fromDate || !recurrencePattern.toDate)) {
      setSubmitError('कृपया शुरू और समाप्ति की तारीख दर्ज करें।');
      setStep(2);
      return;
    }

    setSubmitError('');
    setLoading(true);
    try {
      const formattedDescription = isRecurring
        ? sanitizeText(form.description, 500)
        : `${sanitizeText(form.description, 450)}${form.scheduledDate ? ` [Scheduled: ${form.scheduledDate} ${form.scheduledTime || ''}]` : ''}`;

      const result = await createRequest({
        ...form,
        description: formattedDescription,
        location: sanitizeText(form.location, 200),
        isRecurring,
        recurrencePattern: isRecurring ? recurrencePattern : null,
        sendToTrustedFirst,
        scheduledDate: form.scheduledDate,
        scheduledTime: form.scheduledTime,
      });
      setSubmittedResult(result);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || 'अनुरोध पोस्ट करने में त्रुटि हुई। कृपया पुन: प्रयास करें।');
    } finally {
      setLoading(false);
    }
  }

  // ── Success View ──────────────────────────────────────────
  if (submitted) {
    const isRecurringResult = submittedResult?.count > 0;
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
          background: 'var(--color-bg)',
        }}
      >
        <div
          className="card"
          style={{
            maxWidth: 480,
            width: '100%',
            textAlign: 'center',
            padding: 'var(--space-6)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
            borderRadius: 'var(--radius-xl)',
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-4)',
              boxShadow: '0 8px 20px rgba(16,185,129,0.3)',
            }}
          >
            <Check size={44} strokeWidth={3} />
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 8 }}>
            अनुरोध दर्ज हो गया!
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.05rem', fontWeight: 600, marginBottom: 16 }}>
            Request Successfully Posted
          </p>

          {isRecurringResult ? (
            <div
              style={{
                background: '#EBF5FB',
                padding: '16px',
                borderRadius: 'var(--radius-lg)',
                marginBottom: 24,
                textAlign: 'left',
                border: '1px solid #BEE3F8',
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <RepeatIcon size={18} /> {submittedResult.count} आवर्ती सेवाएँ बनाई गईं
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.5 }}>
                आपकी चुनी हुई तारीखों के अनुसार नियमित सेवा दर्ज हो गई है।
              </p>
            </div>
          ) : (
            <div
              style={{
                background: sendToTrustedFirst ? '#FEF3C7' : '#EFF6FF',
                padding: '16px',
                borderRadius: 'var(--radius-lg)',
                marginBottom: 24,
                textAlign: 'left',
                border: `1px solid ${sendToTrustedFirst ? '#FCD34D' : '#BFDBFE'}`,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: sendToTrustedFirst ? '#92400E' : '#1E40AF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 6,
                }}
              >
                {sendToTrustedFirst ? <ShieldCheck size={20} /> : <span>📢</span>}
                {sendToTrustedFirst ? 'ट्रस्टेड सर्कल प्राथमिकता (15 मिनट)' : 'स्थानीय स्वयंसेवकों को सूचित किया गया'}
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.5 }}>
                {sendToTrustedFirst
                  ? 'पहले आपके पसंदीदा 10 सहायकों को 15 मिनट की विंडो में भेजा गया है। यदि कोई उपलब्ध नहीं होता, तो यह सभी स्थानीय वालंटियर्स को दिखेगा।'
                  : 'आपके क्षेत्र के सेवाभावी सदस्यों को सूचना भेज दी गई है।'}
              </p>
            </div>
          )}

          {/* Bilingual Large Action Buttons (TBoI Accessibility) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              className="btn btn-primary"
              style={{
                minHeight: 58,
                fontSize: '1.05rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
              onClick={() => navigate('/senior/home')}
            >
              <span>🏠 मुख्य पृष्ठ पर जाएँ (Home)</span>
            </button>

            <button
              className="btn btn-outline"
              style={{
                minHeight: 54,
                fontSize: '1rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
              onClick={() => navigate('/my-requests')}
            >
              <span>📋 मेरे अनुरोध देखें (My Requests)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedServiceObj = BILINGUAL_SERVICES.find((s) => s.type === form.serviceType) || BILINGUAL_SERVICES[0];

  return (
    <div className={`page-content no-nav${seniorMode ? ' senior-mode' : ''}`} style={{ background: 'var(--color-bg)', minHeight: '100vh', paddingBottom: 60 }}>
      {/* Top Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
          padding: 'var(--space-5)',
          color: 'white',
          borderBottomLeftRadius: 'var(--radius-xl)',
          borderBottomRightRadius: 'var(--radius-xl)',
          boxShadow: '0 4px 15px rgba(30,58,138,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button
            onClick={() => {
              if (step > 1) setStep(step - 1);
              else navigate(-1);
            }}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: 44,
              height: 44,
              cursor: 'pointer',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Back"
          >
            <ArrowLeft size={22} />
          </button>
          <div style={{ textAlign: 'right', fontSize: '0.85rem', fontWeight: 600, background: 'rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: 999 }}>
            चरण (Step) {step}/4
          </div>
        </div>

        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'white' }}>
          {step === 1 && '1/4 मदद का प्रकार चुनें (Service)'}
          {step === 2 && '2/4 समय व तारीख (When & Time)'}
          {step === 3 && '3/4 विवरण व स्थान (Details & Area)'}
          {step === 4 && '4/4 पुष्टि व सहायक (Confirm & Post)'}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', margin: '4px 0 0', fontWeight: 500 }}>
          {step === 1 && 'आपको किस प्रकार की सहायता या सेवा की आवश्यकता है?'}
          {step === 2 && 'यह सेवा आपको कब चाहिए? एक बार या बार-बार?'}
          {step === 3 && 'बोलकर या लिखकर बताएं और अपना पता पुष्टि करें।'}
          {step === 4 && 'ट्रस्टेड सर्कल वरीयता की जाँच करें और अनुरोध भेजें।'}
        </p>

        {/* Step Progress Bar */}
        <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                background: s <= step ? '#10B981' : 'rgba(255,255,255,0.3)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
      </div>

      {atLimit && (
        <div className="alert alert-warning" style={{ margin: 'var(--space-4) var(--space-5) 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={24} color="#D97706" />
          <div>
            <strong>अधिकतम सीमा (Limit Reached):</strong> आपके पास पहले से {MAX_ACTIVE_REQUESTS} सक्रिय सेवाएँ हैं।
          </div>
        </div>
      )}

      {submitError && (
        <div className="alert alert-danger" style={{ margin: 'var(--space-4) var(--space-5) 0' }}>
          {submitError}
        </div>
      )}

      <div style={{ padding: 'var(--space-5)', opacity: atLimit ? 0.5 : 1, pointerEvents: atLimit ? 'none' : 'auto' }}>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* STEP 1: SERVICE CATEGORY (Bilingual Cards with 64dp+ targets) */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div>
            <label className="input-label" style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, display: 'block' }}>
              सेवा का चयन करें (Select Service Type):
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
              {BILINGUAL_SERVICES.map((item) => {
                const isSelected = form.serviceType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, serviceType: item.type }));
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '16px 20px',
                      minHeight: 68,
                      borderRadius: 'var(--radius-lg)',
                      border: `2.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: isSelected ? '#EFF6FF' : 'white',
                      cursor: 'pointer',
                      textAlign: 'left',
                      boxShadow: isSelected ? '0 4px 14px rgba(37,99,235,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ fontSize: '2rem', flexShrink: 0 }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: isSelected ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
                        {item.hi}
                      </div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                        {item.en}
                      </div>
                    </div>
                    {isSelected && (
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: 'var(--color-primary)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Check size={18} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Next Button */}
            <div style={{ marginTop: 24 }}>
              <button
                type="button"
                className="btn btn-primary btn-full"
                style={{
                  minHeight: 60,
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  boxShadow: '0 4px 15px rgba(37,99,235,0.3)',
                }}
                onClick={() => setStep(2)}
              >
                <span>आगे बढ़ें (Next: Time & Date)</span>
                <ArrowRight size={22} />
              </button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* STEP 2: WHEN & SCHEDULE (Required Date/Time + Full Recurring) */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div>
            <div className="card" style={{ marginBottom: 20, padding: 16, border: '2px solid var(--color-primary-light)', background: '#F8FAFC' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.6rem' }}>{selectedServiceObj.icon}</span>
                <div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>चुनी गई सेवा (Selected Service):</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                    {selectedServiceObj.hi} ({selectedServiceObj.en})
                  </div>
                </div>
              </div>
            </div>

            {/* Request Mode Toggle: One-Time vs Recurring */}
            <label className="input-label" style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 10, display: 'block' }}>
              सेवा की आवृत्ति (Frequency):
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <button
                type="button"
                onClick={() => setIsRecurring(false)}
                style={{
                  minHeight: 58,
                  borderRadius: 'var(--radius-lg)',
                  border: `2.5px solid ${!isRecurring ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: !isRecurring ? '#EFF6FF' : 'white',
                  fontWeight: 800,
                  fontSize: '1rem',
                  color: !isRecurring ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px 14px',
                }}
              >
                <span>📅 एक बार (One Time)</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>Single instance</span>
              </button>

              <button
                type="button"
                onClick={() => setIsRecurring(true)}
                style={{
                  minHeight: 58,
                  borderRadius: 'var(--radius-lg)',
                  border: `2.5px solid ${isRecurring ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: isRecurring ? '#EFF6FF' : 'white',
                  fontWeight: 800,
                  fontSize: '1rem',
                  color: isRecurring ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px 14px',
                }}
              >
                <span>🔁 बार-बार (Recurring)</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>Regular schedule</span>
              </button>
            </div>

            {/* ONE TIME SCHEDULE */}
            {!isRecurring && (
              <div className="card" style={{ padding: 18, marginBottom: 20, borderRadius: 'var(--radius-lg)' }}>
                <h4 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  तारीख व समय (Select Required Date & Time)
                </h4>

                {/* Quick Presets for Seniors */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                  <button
                    type="button"
                    onClick={() => setQuickSchedule('urgent')}
                    style={{
                      minHeight: 48,
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${form.urgency === URGENCY.HIGH ? '#EF4444' : 'var(--color-border)'}`,
                      background: form.urgency === URGENCY.HIGH ? '#FEF2F2' : 'white',
                      color: form.urgency === URGENCY.HIGH ? '#DC2626' : 'var(--color-text-primary)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '6px 4px',
                    }}
                  >
                    ⚡ अभी तुरंत (ASAP)
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickSchedule('evening')}
                    style={{
                      minHeight: 48,
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--color-border)',
                      background: 'white',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '6px 4px',
                    }}
                  >
                    🌅 आज शाम (6 PM)
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickSchedule('tomorrow_morning')}
                    style={{
                      minHeight: 48,
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--color-border)',
                      background: 'white',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '6px 4px',
                    }}
                  >
                    ☀️ कल सुबह (9:30 AM)
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                      <Calendar size={16} color="var(--color-primary)" /> तारीख (Date Required) *
                    </label>
                    <input
                      type="date"
                      className="input"
                      style={{ minHeight: 52, fontSize: '1rem', fontWeight: 600 }}
                      min={todayStr}
                      value={form.scheduledDate}
                      onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                      <Clock size={16} color="var(--color-primary)" /> समय (Preferred Time) *
                    </label>
                    <input
                      type="time"
                      className="input"
                      style={{ minHeight: 52, fontSize: '1rem', fontWeight: 600 }}
                      value={form.scheduledTime}
                      onChange={(e) => setForm((f) => ({ ...f, scheduledTime: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* RECURRING SCHEDULE */}
            {isRecurring && (
              <div className="card" style={{ padding: 18, marginBottom: 20, borderRadius: 'var(--radius-lg)', border: '2px solid var(--color-primary)' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RepeatIcon size={20} /> बार-बार सेवा का शेड्यूल (Recurring Flow)
                </h4>

                {/* Days of Week */}
                <div style={{ marginBottom: 16 }}>
                  <label className="input-label" style={{ fontWeight: 700, marginBottom: 8, display: 'block' }}>
                    सप्ताह के दिन चुनें (Days of Week) *
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {DAYS_OF_WEEK.map(({ key, label }) => {
                      const selected = recurrencePattern.days.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleDay(key)}
                          style={{
                            minHeight: 46,
                            padding: '8px 14px',
                            borderRadius: 'var(--radius-full)',
                            border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            background: selected ? 'var(--color-primary)' : 'white',
                            color: selected ? 'white' : 'var(--color-text-primary)',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Recurring Time */}
                <div style={{ marginBottom: 16 }}>
                  <label className="input-label" style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={16} color="var(--color-primary)" /> समय (Time of Day) *
                  </label>
                  <input
                    className="input"
                    type="time"
                    style={{ minHeight: 52, fontSize: '1rem', fontWeight: 600 }}
                    value={recurrencePattern.time}
                    onChange={(e) => setRecurrencePattern((p) => ({ ...p, time: e.target.value }))}
                  />
                </div>

                {/* From-Date & To-Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label className="input-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block' }}>
                      कब से (From Date) *
                    </label>
                    <input
                      className="input"
                      type="date"
                      min={todayStr}
                      style={{ minHeight: 50, fontSize: '0.92rem' }}
                      value={recurrencePattern.fromDate}
                      onChange={(e) => setRecurrencePattern((p) => ({ ...p, fromDate: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="input-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block' }}>
                      कब तक (To Date) *
                    </label>
                    <input
                      className="input"
                      type="date"
                      min={recurrencePattern.fromDate || todayStr}
                      style={{ minHeight: 50, fontSize: '0.92rem' }}
                      value={recurrencePattern.toDate}
                      onChange={(e) => setRecurrencePattern((p) => ({ ...p, toDate: e.target.value }))}
                    />
                  </div>
                </div>

                {recurrencePattern.days.length > 0 && recurrencePattern.fromDate && recurrencePattern.toDate && (
                  <div
                    style={{
                      background: '#EFF6FF',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.85rem',
                      color: '#1E40AF',
                      fontWeight: 600,
                      marginTop: 10,
                    }}
                  >
                    📅 हर {recurrencePattern.days.join(', ')} को {recurrencePattern.time} बजे, {recurrencePattern.fromDate} से {recurrencePattern.toDate} तक।
                  </div>
                )}
              </div>
            )}

            {/* Stepper Navigation */}
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{
                  flex: 1,
                  minHeight: 58,
                  fontSize: '1rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-lg)',
                }}
                onClick={() => setStep(1)}
              >
                ⬅ पीछे (Back)
              </button>

              <button
                type="button"
                className="btn btn-primary"
                style={{
                  flex: 1.5,
                  minHeight: 58,
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
                onClick={() => setStep(3)}
              >
                <span>आगे बढ़ें (Next)</span>
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* STEP 3: DETAILS & LOCATION (Voice Recording + Read Aloud) */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <div>
            {/* Big Bilingual Voice Assistant Banner */}
            <div
              className="card"
              style={{
                marginBottom: 20,
                padding: '16px 20px',
                borderRadius: 'var(--radius-xl)',
                background: isListening ? '#FEF2F2' : 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                border: `2px solid ${isListening ? '#EF4444' : '#BFDBFE'}`,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                🎙️ बोलकर बताएं (Speak your request)
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', margin: '0 0 14px' }}>
                माइक बटन दबाएँ और हिंदी या अंग्रेज़ी में अपनी ज़रूरत बोलें:
              </p>

              <button
                type="button"
                onClick={() => (isListening ? stopRecording() : startRecording())}
                style={{
                  minHeight: 64,
                  padding: '12px 28px',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  background: isListening ? '#DC2626' : 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                  color: 'white',
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  boxShadow: isListening ? '0 0 20px rgba(220,38,38,0.6)' : '0 4px 14px rgba(37,99,235,0.3)',
                  transition: 'all 0.2s ease',
                }}
              >
                {isListening ? <Square size={22} fill="white" /> : <Mic size={24} />}
                <span>{isListening ? `रोकें (Stop: ${formatSecs(recordingSeconds)})` : 'बोलना शुरू करें (Tap to Speak)'}</span>
              </button>

              {isListening && (
                <div style={{ marginTop: 12, color: '#DC2626', fontWeight: 700, fontSize: '0.95rem', animation: 'pulse 1.2s infinite' }}>
                  ● आपकी आवाज़ रिकॉर्ड हो रही है... बोलिए!
                </div>
              )}

              {audioBlobUrl && !isListening && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginTop: 14,
                    background: 'white',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <Volume2 size={20} color="var(--color-primary)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>आपकी रिकॉर्डिंग:</span>
                  <audio src={audioBlobUrl} controls style={{ height: 36, flex: 1 }} />
                </div>
              )}

              {voiceError && <p style={{ fontSize: '0.85rem', color: '#DC2626', marginTop: 10 }}>{voiceError}</p>}
            </div>

            {/* Description Textarea */}
            <div className="input-group" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="input-label" style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>
                  ज़रूरत का विवरण (Description in words) *
                </label>

                {form.description && (
                  <button
                    type="button"
                    onClick={() => readAloud(form.description)}
                    style={{
                      background: '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      borderRadius: 999,
                      padding: '6px 14px',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: 'var(--color-text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Volume2 size={16} color="var(--color-primary)" />
                    <span>🔊 पढ़कर सुनाएं (Read Aloud)</span>
                  </button>
                )}
              </div>

              <textarea
                className="input"
                style={{ fontSize: '1rem', lineHeight: 1.5, padding: '14px' }}
                placeholder="उदा. मुझे आज शाम 5 बजे ब्लड प्रेशर की दवाई लाने में सहायता चाहिए।"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={4}
                required
              />
            </div>

            {/* Location & Landmark */}
            <div className="input-group" style={{ marginBottom: 20 }}>
              <label className="input-label" style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={18} color="var(--color-primary)" /> आपका पता / लैंडमार्क (Address & Landmark) *
              </label>
              <input
                className="input"
                style={{ minHeight: 52, fontSize: '1rem', fontWeight: 600 }}
                placeholder="उदा. फ़्लैट 302, शांति निकेतन, कम्युनिटी सेंटर के पास"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                required
              />
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                पिनकोड (Pincode): <strong>{currentUser?.pincode || '400001'}</strong> ({currentUser?.area || 'Local Area'})
              </div>
            </div>

            {/* Stepper Navigation */}
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{
                  flex: 1,
                  minHeight: 58,
                  fontSize: '1rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-lg)',
                }}
                onClick={() => setStep(2)}
              >
                ⬅ पीछे (Back)
              </button>

              <button
                type="button"
                className="btn btn-primary"
                style={{
                  flex: 1.5,
                  minHeight: 58,
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
                disabled={!form.description.trim() || !form.location.trim()}
                onClick={() => setStep(4)}
              >
                <span>आगे बढ़ें (Next: Confirm)</span>
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* STEP 4: HELPERS & CONFIRMATION (Trusted First + Urgency + Review) */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {step === 4 && (
          <div>
            {/* Trusted Circle 15-Min Priority Toggle */}
            <div
              onClick={() => setSendToTrustedFirst(!sendToTrustedFirst)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 20px',
                minHeight: 68,
                borderRadius: 'var(--radius-lg)',
                border: `2.5px solid ${sendToTrustedFirst ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: sendToTrustedFirst ? '#EFF6FF' : 'white',
                cursor: 'pointer',
                marginBottom: 20,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: `2.5px solid ${sendToTrustedFirst ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: sendToTrustedFirst ? 'var(--color-primary)' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {sendToTrustedFirst && <Check size={20} color="white" strokeWidth={3} />}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: sendToTrustedFirst ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
                  🙏 पहले ट्रस्टेड सर्कल को भेजें (Trusted Circle First)
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                  आपके {trustedCount > 0 ? `${trustedCount} पसंदीदा सहायकों` : 'पसंदीदा सहायकों (10 तक)'} को पहले 15 मिनट की विशेष सूचना जाएगी।
                </div>
              </div>
            </div>

            {/* Urgency Selection */}
            <div style={{ marginBottom: 20 }}>
              <label className="input-label" style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 8, display: 'block' }}>
                प्राथमिकता स्तर (Urgency Level):
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, urgency: URGENCY.NORMAL }))}
                  style={{
                    minHeight: 56,
                    borderRadius: 'var(--radius-lg)',
                    border: `2px solid ${form.urgency === URGENCY.NORMAL ? '#10B981' : 'var(--color-border)'}`,
                    background: form.urgency === URGENCY.NORMAL ? '#ECFDF5' : 'white',
                    cursor: 'pointer',
                    padding: '10px 14px',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: form.urgency === URGENCY.NORMAL ? '#059669' : 'var(--color-text-primary)' }}>
                    🟢 सामान्य (Normal)
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>सुविधाजनक समय पर</div>
                </button>

                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, urgency: URGENCY.HIGH }))}
                  style={{
                    minHeight: 56,
                    borderRadius: 'var(--radius-lg)',
                    border: `2px solid ${form.urgency === URGENCY.HIGH ? '#EF4444' : 'var(--color-border)'}`,
                    background: form.urgency === URGENCY.HIGH ? '#FEF2F2' : 'white',
                    cursor: 'pointer',
                    padding: '10px 14px',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: form.urgency === URGENCY.HIGH ? '#DC2626' : 'var(--color-text-primary)' }}>
                    🔴 तत्काल (Urgent)
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>जल्द से जल्द सहायता</div>
                </button>
              </div>
            </div>

            {/* Review Summary Card */}
            <div
              className="card"
              style={{
                marginBottom: 24,
                padding: '18px 20px',
                borderRadius: 'var(--radius-xl)',
                border: '1.5px solid #CBD5E1',
                background: '#F8FAFC',
              }}
            >
              <h4 style={{ margin: '0 0 14px', fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                📋 अनुरोध का पूर्वावलोकन (Summary)
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.92rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: 8 }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>सेवा:</span>
                  <span style={{ fontWeight: 700 }}>
                    {selectedServiceObj.icon} {selectedServiceObj.hi}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: 8 }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>शेड्यूल:</span>
                  <span style={{ fontWeight: 700 }}>
                    {isRecurring
                      ? `🔁 हर ${recurrencePattern.days.join(', ')} (${recurrencePattern.time})`
                      : `📅 ${form.scheduledDate} (${form.scheduledTime})`}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: 8 }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>स्थान:</span>
                  <span style={{ fontWeight: 700, textAlign: 'right', maxWidth: '65%' }}>{form.location}</span>
                </div>

                <div>
                  <span style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>विवरण:</span>
                  <div style={{ fontWeight: 600, background: 'white', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid #E2E8F0' }}>
                    "{form.description}"
                  </div>
                </div>
              </div>
            </div>

            {/* Stepper Navigation & Submit */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                type="button"
                className="btn btn-primary btn-full"
                style={{
                  minHeight: 64,
                  fontSize: '1.2rem',
                  fontWeight: 900,
                  borderRadius: 'var(--radius-xl)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  boxShadow: '0 6px 20px rgba(37,99,235,0.4)',
                }}
                disabled={loading}
                onClick={handleSubmit}
              >
                <span>{loading ? 'दर्ज हो रहा है… (Posting...)' : '🚀 अनुरोध भेजें (Confirm & Post)'}</span>
              </button>

              <button
                type="button"
                className="btn btn-outline btn-full"
                style={{
                  minHeight: 52,
                  fontSize: '1rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-lg)',
                }}
                onClick={() => setStep(3)}
              >
                ⬅ विवरण बदलें (Edit Details)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
