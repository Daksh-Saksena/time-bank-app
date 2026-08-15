// ---- TimeLedger.jsx ---- Time ledger screen (shared between roles)
import { useApp } from '../../context/AppContext';
import { formatMinutes, SERVICE_ICONS } from '../../data/mockData';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TimeLedger() {
  const { currentUser, getUserLedger } = useApp();
  const txns = getUserLedger();
  const earned = txns.filter((t) => t.type === 'credit').reduce((s, t) => s + t.minutes, 0);
  const spent = txns.filter((t) => t.type === 'debit').reduce((s, t) => s + t.minutes, 0);
  const balance = currentUser?.timeBalance || 0;

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <h2 className="page-title">Time Ledger</h2>
            <p className="page-subtitle">Your time balance and history</p>
          </div>
        </div>
      </div>

      {/* Balance card */}
      <div style={{ padding: 'var(--space-5)' }}>
        <div style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', color: 'white', marginBottom: 'var(--space-5)' }}>
          <p style={{ opacity: 0.8, fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-2)' }}>Current Balance</p>
          <div style={{ fontSize: '3rem', fontWeight: 800, marginBottom: 'var(--space-4)', lineHeight: 1 }}>
            {formatMinutes(balance)}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
            <div>
              <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>+{formatMinutes(earned)}</div>
              <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8 }}>Earned</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.3)' }} />
            <div>
              <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>−{formatMinutes(spent)}</div>
              <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8 }}>Used</div>
            </div>
          </div>
        </div>

        {/* Transaction history */}
        <h3 style={{ marginBottom: 'var(--space-4)' }}>Transaction History</h3>

        {txns.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <img src="/logo.png" alt="Logo" style={{ width: '60px', height: '60px' }} />
            </div>
            <p>No transactions yet.</p>
            <p style={{ fontSize: 'var(--font-size-sm)' }}>Complete a task to start earning time.</p>
          </div>
        ) : (
          txns.map((txn) => (
            <div key={txn.id} className="ledger-row">
              <div className={`ledger-icon ${txn.type}`}>
                {txn.service ? SERVICE_ICONS[txn.service] : txn.type === 'credit' ? '' : ''}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 2 }}>{txn.label}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{formatDate(txn.date)}</div>
                {(txn.volunteerName || txn.seniorName) && (
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    {txn.volunteerName ? `Volunteer: ${txn.volunteerName}` : `Senior: ${txn.seniorName}`}
                  </div>
                )}
              </div>
              <div className={`ledger-amount ${txn.type === 'credit' ? 'txn-credit' : 'txn-debit'}`}>
                {txn.type === 'credit' ? '+' : '−'}{formatMinutes(txn.minutes)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
