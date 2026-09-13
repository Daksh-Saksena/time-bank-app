import { useState, useEffect, useRef } from 'react';
import { X, Video, VideoOff } from 'lucide-react';

/**
 * VideoCallModal — Daily.co embed for Video Assistance (F3)
 * Creates a unique room per task (tbi-task-{requestId})
 * No phone number sharing needed — room name is the only identifier
 */
export default function VideoCallModal({ isOpen, onClose, requestId, title = 'Video Help' }) {
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');
  const frameRef = useRef(null);
  const callRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !requestId) return;

    async function ensureDailyRoom(roomName) {
      const cleanName = roomName.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60);
      const domain = (import.meta.env.VITE_DAILY_DOMAIN || 'daksh-s.daily.co').replace(/^https?:\/\//, '').replace(/\/$/, '');
      const fallbackUrl = `https://${domain}/${cleanName}`;

      // Try secure serverless API first
      try {
        const apiRes = await fetch(`/api/daily-room?name=${cleanName}`);
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          if (apiData.url) return apiData.url;
        }
      } catch (e) {
        // Fallback for native Capacitor or local non-serverless dev
      }

      const apiKey = import.meta.env.VITE_DAILY_API_KEY;
      if (!apiKey) return fallbackUrl;

      try {
        const res = await fetch(`https://api.daily.co/v1/rooms/${cleanName}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (res.ok) {
          const data = await res.json();
          return data.url || fallbackUrl;
        }
        const createRes = await fetch('https://api.daily.co/v1/rooms', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: cleanName,
            privacy: 'public',
            properties: {
              enable_chat: true,
              enable_screenshare: false,
              exp: Math.floor(Date.now() / 1000) + 86400 * 7,
            },
          }),
        });
        if (createRes.ok) {
          const createData = await createRes.json();
          return createData.url || fallbackUrl;
        }
      } catch (err) {
        console.warn('[VideoCall] Daily room creation fallback:', err);
      }
      return fallbackUrl;
    }

    async function initCall() {
      try {
        const DailyIframe = (await import('@daily-co/daily-js')).default;
        if (callRef.current) return;

        const targetUrl = await ensureDailyRoom(`tbi-${requestId}`);

        callRef.current = DailyIframe.createFrame(frameRef.current, {
          showLeaveButton: true,
          showFullscreenButton: true,
          iframeStyle: { width: '100%', height: '100%', border: 'none', borderRadius: 12 },
        });

        callRef.current.on('left-meeting', () => {
          onClose();
        });

        await callRef.current.join({ url: targetUrl });
        setJoined(true);
      } catch (err) {
        console.error('[VideoCall] Daily.co error:', err);
        setError('Could not connect to video. Please check your internet and try again.');
      }
    }

    initCall();

    return () => {
      if (callRef.current) {
        try { callRef.current.destroy(); } catch (e) {}
        callRef.current = null;
      }
      setJoined(false);
      setError('');
    };
  }, [isOpen, requestId]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Video size={20} />
          <span style={{ fontWeight: 700, fontSize: 'var(--font-size-base)' }}>{title}</span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close video call"
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Video frame */}
      <div style={{ flex: 1, padding: '0 8px 16px', position: 'relative' }}>
        {error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, color: 'white', textAlign: 'center', padding: 24 }}>
            <VideoOff size={48} color="#E74C3C" />
            <p style={{ fontSize: 'var(--font-size-sm)' }}>{error}</p>
            <button onClick={onClose} style={{ background: '#E74C3C', color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontFamily: 'var(--font-family)' }}>Close</button>
          </div>
        ) : (
          <>
            {!joined && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 1 }}>
                <div style={{ width: 48, height: 48, border: '4px solid rgba(255,255,255,0.2)', borderTop: '4px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: 'white', fontSize: 'var(--font-size-sm)' }}>Connecting to video…</p>
              </div>
            )}
            <div ref={frameRef} style={{ width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden', background: '#111' }} />
          </>
        )}
      </div>

      {/* Footer note */}
      <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 'var(--font-size-xs)', paddingBottom: 16 }}>
        🔒 Secure video — no phone numbers shared
      </p>
    </div>
  );
}
