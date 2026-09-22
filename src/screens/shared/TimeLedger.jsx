// ---- TimeLedger.jsx ---- Seva ledger screen (Pure Seva Model)
import { useApp } from '../../context/AppContext';
import { formatMinutes, SERVICE_ICONS } from '../../constants';
import { HeartHandshake, CheckCircle2, Award, Calendar } from 'lucide-react';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TimeLedger() {
  const { currentUser, getUserLedger, getVolunteerMetrics } = useApp();
  const txns = getUserLedger();
  const metrics = getVolunteerMetrics();

  return (
    <div className="page-content" style={{ paddingBottom: 80 }}>
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <h2 className="page-title">सेवा रिकॉर्ड (Seva Record)</h2>
            <p className="page-subtitle">Pure Seva: Tracked for gratitude & community appreciation</p>
          </div>
        </div>
      </div>

      <div style={{ padding: 'var(--space-5)' }}>
        {/* Pure Seva Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-6)',
            color: 'white',
            marginBottom: 'var(--space-5)',
            boxShadow: '0 8px 24px rgba(30,58,138,0.25)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.9 }}>
              कुल सेवा योगदान (Total Seva Given)
            </span>
            <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 999, fontWeight: 700 }}>
              No Spendable Credits
            </span>
          </div>

          <div style={{ fontSize: '3rem', fontWeight: 900, marginBottom: 'var(--space-4)', lineHeight: 1 }}>
            {formatMinutes(metrics.totalSevaMinutes)}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-6)', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 'var(--space-4)' }}>
            <div>
              <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800 }}>{metrics.tasksCompleted}</div>
              <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.85 }}>Tasks Completed</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.3)' }} />
            <div>
              <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800 }}>{metrics.peopleHelped}</div>
              <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.85 }}>People Helped</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.3)' }} />
            <div>
              <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800 }}>100%</div>
              <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.85 }}>Free Seva</div>
            </div>
          </div>
        </div>

        {/* Transaction / Seva History */}
        <h3 style={{ marginBottom: 'var(--space-4)', fontWeight: 800, fontSize: '1.1rem' }}>
          सेवा गतिविधि इतिहास (Seva Activity History)
        </h3>

        {txns.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-6)', background: '#F8FAFC', borderRadius: 'var(--radius-lg)' }}>
            <div className="empty-state-icon">
              <img src="/logo.png" alt="Logo" style={{ width: '60px', height: '60px', borderRadius: '50%' }} />
            </div>
            <p style={{ fontWeight: 700, margin: '8px 0 4px' }}>कोई पूर्व गतिविधि नहीं (No Records Yet)</p>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
              सेवा कार्य पूरा करने पर आपकी गतिविधि यहाँ दर्ज होगी।
            </p>
          </div>
        ) : (
          txns.map((txn) => (
            <div key={txn.id} className="ledger-row" style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'white', marginBottom: 10, border: '1px solid var(--color-border)' }}>
              <div className="ledger-icon" style={{ background: '#EFF6FF', color: '#2563EB', width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                {txn.service ? SERVICE_ICONS[txn.service] : '🤝'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', marginBottom: 2 }}>{txn.label}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{formatDate(txn.date || txn.created_at)}</div>
                {(txn.volunteerName || txn.seniorName || txn.counterparty_name) && (
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    सहभागी: <strong>{txn.counterparty_name || txn.volunteerName || txn.seniorName}</strong>
                  </div>
                )}
              </div>
              <div style={{ fontWeight: 800, color: '#16A34A', fontSize: '1rem' }}>
                +{formatMinutes(txn.minutes)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
