import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Trophy, Star, Medal, Download, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { formatMinutes } from '../../constants';
import { getPincodeLocation } from '../../lib/geo';

const FILTERS = [
  { key: 'all', label: 'All Time' },
  { key: 'year', label: 'This Year' },
  { key: 'month', label: 'This Month' },
];

const RANK_STYLES = [
  { bg: '#FFD700', color: '#7B5200', label: '🥇' },
  { bg: '#C0C0C0', color: '#444', label: '🥈' },
  { bg: '#CD7F32', color: '#5C2E00', label: '🥉' },
];

// ── Generate Certificate Canvas ───────────────────────────
function generateCertificate(volunteer) {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 560;
  const ctx = canvas.getContext('2d');

  // Background
  const grad = ctx.createLinearGradient(0, 0, 800, 560);
  grad.addColorStop(0, '#1a237e');
  grad.addColorStop(1, '#283593');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 800, 560);

  // Gold border
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 6;
  ctx.strokeRect(20, 20, 760, 520);

  // Inner border
  ctx.strokeStyle = 'rgba(255,215,0,0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(32, 32, 736, 496);

  // Title
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 36px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🏆 Seva Samman Patra', 400, 90);

  // Subtitle
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = '18px Arial, sans-serif';
  ctx.fillText('Time Bank of India — Certificate of Seva Gratitude', 400, 130);

  // Divider
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(100, 150);
  ctx.lineTo(700, 150);
  ctx.stroke();

  // Volunteer name
  ctx.fillStyle = 'white';
  ctx.font = 'bold 46px Arial, sans-serif';
  ctx.fillText(volunteer.name || 'Sevak', 400, 230);

  // Description
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = '20px Arial, sans-serif';
  ctx.fillText('has wholeheartedly dedicated', 400, 275);

  // Hours
  const sevaMins = volunteer.totalSevaMinutes || volunteer.time_balance || 0;
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 56px Arial, sans-serif';
  ctx.fillText(formatMinutes(sevaMins), 400, 345);

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = '20px Arial, sans-serif';
  ctx.fillText('of voluntary community seva for senior citizens', 400, 385);

  // Area
  const geo = getPincodeLocation(volunteer.pincode, volunteer.area);
  ctx.font = '16px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText(`📍 ${geo.full} (${volunteer.pincode || '400001'})`, 400, 415);

  // Footer
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillText('timebankofIndia.org · Pure Seva Model', 400, 460);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '12px Arial, sans-serif';
  ctx.fillText(`Issued with Community Gratitude: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, 400, 485);

  return canvas.toDataURL('image/png');
}

export default function Leaderboard() {
  const { currentUser, fetchLeaderboard } = useApp();
  const [tab, setTab] = useState('pincode'); // 'pincode' | 'india'
  const [filter, setFilter] = useState('all');
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const loadLeaders = useCallback(async () => {
    setLoading(true);
    try {
      const pincode = tab === 'pincode' ? (currentUser?.pincode || '400001') : null;
      const data = await fetchLeaderboard({ pincode, period: filter });
      setLeaders(data);
    } finally {
      setLoading(false);
    }
  }, [tab, filter, currentUser, fetchLeaderboard]);

  useEffect(() => {
    loadLeaders();
  }, [loadLeaders]);

  function handleShareCertificate(volunteer) {
    try {
      const dataUrl = generateCertificate(volunteer);
      const link = document.createElement('a');
      link.download = `seva-certificate-${volunteer.name?.replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      alert('Certificate generated! Share it from your downloads.');
    }
  }

  const myEntry = leaders.find((l) => l.id === currentUser?.id);
  const myRank = myEntry ? leaders.indexOf(myEntry) + 1 : null;
  const currentGeo = getPincodeLocation(currentUser?.pincode, currentUser?.area);

  return (
    <div className="page-content">
      {/* Header */}
      <div className="hero-banner">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🏆</div>
          <h2 style={{ color: 'white', fontWeight: 800, marginBottom: 4 }}>Seva Wall</h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 'var(--font-size-sm)' }}>
            Samman Patra — Honoring our Voluntary Sevadars
          </p>
        </div>
      </div>

      <div style={{ padding: 'var(--space-5)' }}>
        {/* My rank card */}
        {myEntry && myRank && (
          <div style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: '2rem' }}>{myRank <= 3 ? RANK_STYLES[myRank - 1].label : `#${myRank}`}</div>
            <div>
              <div style={{ fontWeight: 700, color: '#7B5200' }}>Your Seva Ranking</div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: '#5C4000', fontWeight: 600 }}>
                {formatMinutes(myEntry.totalSevaMinutes || myEntry.time_balance || 0)} seva given ({myEntry.tasksCompleted || 0} tasks)
              </div>
            </div>
            <button
              onClick={() => handleShareCertificate(myEntry)}
              style={{ marginLeft: 'auto', background: 'rgba(0,0,0,0.15)', border: 'none', borderRadius: 'var(--radius-md)', padding: '8px 14px', cursor: 'pointer', color: '#7B5200', fontWeight: 700, fontFamily: 'var(--font-family)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)' }}
            >
              <Download size={14} /> Certificate
            </button>
          </div>
        )}

        {/* View tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-4)', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-lg)', padding: 4 }}>
          {[
            { key: 'pincode', label: `📍 My Pincode (${currentUser?.pincode || '400001'})` },
            { key: 'india', label: '🇮🇳 All India' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-family)',
                fontWeight: tab === key ? 800 : 600,
                background: tab === key ? 'white' : 'transparent',
                color: tab === key ? 'var(--color-primary)' : 'var(--color-text-muted)',
                fontSize: 'var(--font-size-sm)',
                boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Period filter pills */}
        <div className="filter-pills" style={{ marginBottom: 'var(--space-4)' }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`filter-pill${filter === f.key ? ' active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Leaderboard list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>⏳</div>
            <p>Updating Seva Wall…</p>
          </div>
        ) : leaders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏆</div>
            <h3>No Seva Completed Yet</h3>
            <p>No volunteers have completed seva in this period.</p>
            <p style={{ fontSize: 'var(--font-size-sm)' }}>Volunteer to help a senior citizen to earn gratitude!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {leaders.map((vol, idx) => {
              const rank = idx + 1;
              const rankStyle = rank <= 3 ? RANK_STYLES[rank - 1] : null;
              const isMe = vol.id === currentUser?.id;
              const isExpanded = expandedId === vol.id;
              const volGeo = getPincodeLocation(vol.pincode, vol.area);
              const volMins = vol.totalSevaMinutes || vol.time_balance || 0;

              return (
                <div
                  key={vol.id}
                  className="card"
                  style={{
                    border: isMe ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: rankStyle ? `${rankStyle.bg}18` : isMe ? 'var(--color-surface-alt)' : 'white',
                    cursor: 'pointer',
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : vol.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Rank */}
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: rankStyle ? rankStyle.bg : 'var(--color-surface-alt)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: rank <= 3 ? '1.4rem' : 'var(--font-size-base)',
                      color: rankStyle?.color || 'var(--color-text-muted)',
                    }}>
                      {rank <= 3 ? rankStyle.label : `#${rank}`}
                    </div>

                    {/* Name */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{vol.name}</span>
                        {isMe && <span style={{ fontSize: 10, background: 'var(--color-primary)', color: 'white', padding: '2px 6px', borderRadius: 'var(--radius-full)' }}>You</span>}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        📍 {volGeo.full} · {vol.tasksCompleted || 0} task{vol.tasksCompleted === 1 ? '' : 's'}
                      </div>
                    </div>

                    {/* Hours */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: rank <= 3 ? rankStyle.color : '#16A34A', fontSize: 'var(--font-size-lg)' }}>
                        {formatMinutes(volMins)}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>seva given</div>
                    </div>

                    {isExpanded ? <ChevronUp size={16} color="var(--color-text-muted)" /> : <ChevronDown size={16} color="var(--color-text-muted)" />}
                  </div>

                  {/* Expanded: rating + certificate */}
                  {isExpanded && (
                    <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        {vol.rating ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Star size={14} color="#F59E0B" fill="#F59E0B" />
                            <span style={{ fontWeight: 800, fontSize: 'var(--font-size-sm)' }}>{vol.rating.toFixed(1)}</span>
                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>({vol.reviewCount || 1} review{vol.reviewCount === 1 ? '' : 's'})</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                            ⭐ No reviews yet (New Sevak)
                          </span>
                        )}
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); handleShareCertificate(vol); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-family)', fontSize: 'var(--font-size-xs)', fontWeight: 700 }}
                      >
                        <Share2 size={12} /> Certificate
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
