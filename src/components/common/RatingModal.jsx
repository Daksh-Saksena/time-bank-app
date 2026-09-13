import { useState, useRef } from 'react';
import Modal from './Modal';
import { useApp } from '../../context/AppContext';
import { ROLES, RATING_TAGS_POSITIVE, RATING_TAGS_NEGATIVE } from '../../constants';
import { supabase } from '../../lib/supabase';
import { Mic, Square, Volume2 } from 'lucide-react';

// ── Large Emoji Star Rating ───────────────────────────────
const STAR_EMOJIS = ['😞', '😕', '😐', '🙂', '😍'];
const STAR_LABELS = ['Very Bad', 'Not Good', 'Okay', 'Good', 'Excellent'];

function EmojiStarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            onTouchStart={() => setHovered(s)}
            onTouchEnd={() => { onChange(s); setHovered(0); }}
            aria-label={`${s} star — ${STAR_LABELS[s - 1]}`}
            style={{
              background: 'none',
              border: 'none',
              fontSize: s === display ? '3.2rem' : '2.2rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
              transform: s === display ? 'scale(1.15)' : 'scale(1)',
              filter: s <= display ? 'none' : 'grayscale(1) opacity(0.4)',
              padding: 4,
            }}
          >
            {STAR_EMOJIS[s - 1]}
          </button>
        ))}
      </div>
      {display > 0 && (
        <p style={{ textAlign: 'center', fontWeight: 700, color: 'var(--color-primary)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
          {STAR_LABELS[display - 1]}
        </p>
      )}
    </div>
  );
}

// ── Tag Chip ─────────────────────────────────────────────
function TagChip({ label, selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        padding: '8px 14px',
        borderRadius: 'var(--radius-full)',
        border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
        background: selected ? 'var(--color-primary)' : 'white',
        color: selected ? 'white' : 'var(--color-text-secondary)',
        fontSize: 'var(--font-size-sm)',
        fontWeight: selected ? 700 : 500,
        cursor: 'pointer',
        fontFamily: 'var(--font-family)',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

export default function RatingModal() {
  const { pendingRating, dismissRating, submitRating, currentUser, requests } = useApp();
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState([]);
  const [review, setReview] = useState('');
  const [photo, setPhoto] = useState(null);
  const [voiceUrl, setVoiceUrl] = useState(null);
  const [voiceBlobUrl, setVoiceBlobUrl] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  if (!pendingRating) return null;
  const req = requests.find((r) => r.id === pendingRating.requestId);
  if (!req) return null;

  const isVolunteer = currentUser?.role === ROLES.VOLUNTEER;
  const revieweeName = isVolunteer ? req.seniorName : req.assignedVolunteerName;
  const revieweeId = isVolunteer ? req.seniorId : req.assignedVolunteerId;

  function toggleTag(key) {
    setTags((prev) => prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]);
  }

  async function startVoice() {
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setVoiceBlobUrl(url);
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => setVoiceUrl(reader.result);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setIsRecording(true);
      setRecordingSecs(0);
      timerRef.current = setInterval(() => {
        setRecordingSecs((s) => {
          if (s >= 29) { stopVoice(); return 30; }
          return s + 1;
        });
      }, 1000);
    } catch (e) {
      console.warn('[Rating Voice] mic error:', e);
    }
  }

  function stopVoice() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    setIsRecording(false);
  }

  function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    if (stars === 0) return;
    setSubmitting(true);
    try {
      await submitRating({
        requestId: pendingRating.requestId,
        stars,
        review,
        revieweeId,
        revieweeName,
        tags,
        voiceFeedbackUrl: voiceUrl || null,
        photoUrl: photo || null,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const positiveSection = !isVolunteer ? RATING_TAGS_POSITIVE : [];
  const negativeSection = !isVolunteer ? RATING_TAGS_NEGATIVE : [];

  return (
    <Modal isOpen={true} onClose={null} title="">
      <div style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>⭐</div>
          <h3 style={{ marginBottom: 4 }}>
            {isVolunteer ? 'Rate the Senior' : 'Rate your Volunteer'}
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
            How was your experience with <strong>{revieweeName}</strong>?
          </p>
        </div>

        {/* Emoji Star Rating */}
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <EmojiStarRating value={stars} onChange={setStars} />
        </div>

        {/* Quick Tags */}
        {!isVolunteer && stars > 0 && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 8 }}>Quick Feedback</p>
            {stars >= 4 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {RATING_TAGS_POSITIVE.map((t) => (
                  <TagChip key={t.key} label={t.label} selected={tags.includes(t.key)} onToggle={() => toggleTag(t.key)} />
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {RATING_TAGS_NEGATIVE.map((t) => (
                  <TagChip key={t.key} label={t.label} selected={tags.includes(t.key)} onToggle={() => toggleTag(t.key)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Written Review */}
        <div className="input-group" style={{ marginBottom: 'var(--space-3)' }}>
          <label className="input-label">Write a review (optional)</label>
          <textarea
            className="input"
            placeholder="Share your experience..."
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={3}
          />
        </div>

        {/* Voice Feedback (30 sec) */}
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 8 }}>Voice Feedback (optional · 30 sec)</p>
          {!voiceBlobUrl ? (
            <button
              type="button"
              onClick={isRecording ? stopVoice : startVoice}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                borderRadius: 'var(--radius-full)',
                border: 'none',
                background: isRecording ? '#E74C3C' : 'var(--color-primary)',
                color: 'white', fontWeight: 600, fontSize: 'var(--font-size-sm)',
                cursor: 'pointer', fontFamily: 'var(--font-family)',
                boxShadow: isRecording ? '0 0 12px rgba(231,76,60,0.5)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {isRecording ? <Square size={16} /> : <Mic size={16} />}
              <span>{isRecording ? `Stop (${recordingSecs}s / 30s)` : '🎙️ Record Voice Feedback'}</span>
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', padding: '8px 12px' }}>
              <Volume2 size={16} color="var(--color-primary)" />
              <audio src={voiceBlobUrl} controls style={{ flex: 1, height: 32 }} />
              <button type="button" onClick={() => { setVoiceBlobUrl(null); setVoiceUrl(null); }} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Photo Upload */}
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 8 }}>Photo (optional)</p>
          {!photo ? (
            <label htmlFor="rating-photo" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', border: '1.5px dashed var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
              📷 Add Photo
              <input id="rating-photo" type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} />
            </label>
          ) : (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img src={photo} alt="feedback" style={{ maxHeight: 80, borderRadius: 8, objectFit: 'cover' }} />
              <button type="button" onClick={() => setPhoto(null)} style={{ position: 'absolute', top: -6, right: -6, background: '#E74C3C', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
          )}
        </div>

        {/* Required notice */}
        {stars === 0 && (
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: 'var(--space-3)' }}>
            ⭐ Rating is required to close this task
          </p>
        )}

        {/* Submit button */}
        <button
          className="btn btn-primary btn-full btn-lg"
          onClick={handleSubmit}
          disabled={stars === 0 || submitting}
        >
          {submitting ? 'Submitting…' : '✓ Submit Rating & Close Task'}
        </button>
      </div>
    </Modal>
  );
}
