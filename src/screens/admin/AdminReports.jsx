import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { REQUEST_STATUS, ROLES, formatMinutes } from '../../constants';
import { BarChart2, Users, AlertTriangle, Download, FileText, TrendingUp } from 'lucide-react';

// ── Mini bar chart using CSS ──────────────────────────────
function MiniBar({ label, value, max, color = 'var(--color-primary)' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 'var(--font-size-xs)' }}>
        <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ background: 'var(--color-border)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

export default function AdminReports() {
  const { currentUser, requests, members } = useApp();
  const [stats, setStats] = useState(null);
  const [vulnerableSeniors, setVulnerableSeniors] = useState([]);
  const [volunteerReport, setVolunteerReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');

  const pincode = currentUser?.pincode;

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Filter requests for this pincode
      const pincodeRequests = pincode
        ? requests.filter((r) => r.pincode === pincode)
        : requests;

      const todayRequests = pincodeRequests.filter((r) => new Date(r.createdAt) >= today);

      // Category breakdown
      const categories = {};
      pincodeRequests.forEach((r) => {
        categories[r.serviceType] = (categories[r.serviceType] || 0) + 1;
      });

      // Volunteer stats
      const volunteers = members.filter((m) => m.role === ROLES.VOLUNTEER && (!pincode || m.pincode === pincode));
      const volStats = volunteers.map((v) => {
        const vReqs = pincodeRequests.filter((r) => r.assignedVolunteerId === v.id);
        const accepted = vReqs.filter((r) => [REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.IN_PROGRESS, REQUEST_STATUS.COMPLETED, REQUEST_STATUS.RATED, REQUEST_STATUS.CLOSED].includes(r.status));
        const completed = vReqs.filter((r) => [REQUEST_STATUS.COMPLETED, REQUEST_STATUS.RATED, REQUEST_STATUS.CLOSED].includes(r.status));
        const totalMins = completed.reduce((s, r) => s + (r.duration || 0), 0);
        return {
          ...v,
          acceptCount: accepted.length,
          completeCount: completed.length,
          totalHours: totalMins,
          acceptPct: vReqs.length > 0 ? Math.round((accepted.length / vReqs.length) * 100) : 0,
          completePct: accepted.length > 0 ? Math.round((completed.length / accepted.length) * 100) : 0,
        };
      });

      setVolunteerReport(volStats.sort((a, b) => b.totalHours - a.totalHours));

      // Vulnerable seniors (0 activity in last 7 days)
      const seniors = members.filter((m) => m.role === ROLES.SENIOR && (!pincode || m.pincode === pincode));
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const vulnerable = seniors.filter((s) => {
        const recentActivity = pincodeRequests.filter(
          (r) => r.seniorId === s.id && new Date(r.createdAt) > sevenDaysAgo
        );
        return recentActivity.length === 0;
      });
      setVulnerableSeniors(vulnerable);

      setStats({
        todayCreated: todayRequests.length,
        todayPending: todayRequests.filter((r) => r.status === REQUEST_STATUS.OPEN).length,
        todayCompleted: todayRequests.filter((r) => [REQUEST_STATUS.COMPLETED, REQUEST_STATUS.RATED, REQUEST_STATUS.CLOSED].includes(r.status)).length,
        totalCompleted: pincodeRequests.filter((r) => [REQUEST_STATUS.COMPLETED, REQUEST_STATUS.RATED, REQUEST_STATUS.CLOSED].includes(r.status)).length,
        totalCancelled: pincodeRequests.filter((r) => r.status === REQUEST_STATUS.CANCELLED).length,
        totalSeniors: seniors.length,
        totalVolunteers: volunteers.length,
        categories,
        categoryMax: Math.max(...Object.values(categories), 1),
      });
    } finally {
      setLoading(false);
    }
  }, [requests, members, pincode]);

  useEffect(() => { loadStats(); }, [loadStats]);

  // ── Export to Excel ───────────────────────────────────────
  async function exportExcel() {
    setExporting('excel');
    try {
      const XLSX = (await import('xlsx')).default;
      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        ['Time Bank of India — Report', `Generated: ${new Date().toLocaleDateString('en-IN')}`],
        ['Pincode', pincode || 'All'],
        [],
        ['Today Created', stats?.todayCreated],
        ['Today Pending', stats?.todayPending],
        ['Today Completed', stats?.todayCompleted],
        ['Total Completed (All Time)', stats?.totalCompleted],
        ['Total Cancelled', stats?.totalCancelled],
        ['Total Seniors', stats?.totalSeniors],
        ['Total Volunteers', stats?.totalVolunteers],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Summary');

      // Volunteer report sheet
      const volHeaders = ['Name', 'Area', 'Accept Count', 'Complete Count', 'Total Hours', 'Accept %', 'Complete %', 'Rating'];
      const volRows = volunteerReport.map((v) => [
        v.name, v.area, v.acceptCount, v.completeCount,
        formatMinutes(v.totalHours), `${v.acceptPct}%`, `${v.completePct}%`, (v.rating || 0).toFixed(1)
      ]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([volHeaders, ...volRows]), 'Volunteers');

      // Vulnerable seniors sheet
      const vulHeaders = ['Name', 'Phone', 'Area', 'Last Login'];
      const vulRows = vulnerableSeniors.map((s) => [s.name, s.phone || '-', s.area || '-', 'No activity in 7 days']);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([vulHeaders, ...vulRows]), 'Vulnerable Seniors');

      XLSX.writeFile(wb, `TBI-Report-${pincode || 'All'}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      console.error('Excel export error:', e);
      alert('Export failed. Please try again.');
    } finally {
      setExporting('');
    }
  }

  // ── Export to PDF ─────────────────────────────────────────
  async function exportPDF() {
    setExporting('pdf');
    try {
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF();
      let y = 20;

      doc.setFontSize(18);
      doc.setTextColor(26, 35, 126);
      doc.text('Time Bank of India — Report', 20, y); y += 10;

      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Pincode: ${pincode || 'All'} | Generated: ${new Date().toLocaleDateString('en-IN')}`, 20, y); y += 14;

      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Today Summary', 20, y); y += 8;
      doc.setFontSize(11);
      [
        [`Today Created: ${stats?.todayCreated || 0}`],
        [`Today Pending: ${stats?.todayPending || 0}`],
        [`Today Completed: ${stats?.todayCompleted || 0}`],
        [`Total Completed: ${stats?.totalCompleted || 0}`],
        [`Total Seniors: ${stats?.totalSeniors || 0}`],
        [`Total Volunteers: ${stats?.totalVolunteers || 0}`],
      ].forEach(([text]) => { doc.text(`  • ${text}`, 20, y); y += 7; });

      y += 6;
      doc.setFontSize(14);
      doc.text('Volunteer Report', 20, y); y += 8;
      doc.setFontSize(10);
      volunteerReport.slice(0, 15).forEach((v) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`  ${v.name} — ${formatMinutes(v.totalHours)} seva, Rating: ${(v.rating || 0).toFixed(1)}, Complete: ${v.completePct}%`, 20, y);
        y += 6;
      });

      if (vulnerableSeniors.length > 0) {
        y += 6;
        doc.setFontSize(14);
        doc.text('Vulnerable Seniors (0 activity in 7 days)', 20, y); y += 8;
        doc.setFontSize(10);
        vulnerableSeniors.forEach((s) => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(`  • ${s.name} — ${s.area || '-'}`, 20, y); y += 6;
        });
      }

      doc.save(`TBI-Report-${pincode || 'All'}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error('PDF export error:', e);
      alert('PDF export failed. Please try again.');
    } finally {
      setExporting('');
    }
  }

  if (loading) {
    return (
      <div className="page-content">
        <div className="page-header"><h2 className="page-title">Reports</h2></div>
        <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
          <p>Loading report data…</p>
        </div>
      </div>
    );
  }

  const categoryLabel = { medicine: '💊 Medicine', groceries: '🛒 Groceries', bank: '🏦 Bank', walk: '🚶 Walk', emotional: '🤗 Emotional', other: '🤝 Other' };

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <h2 className="page-title">📊 Reports</h2>
            <p className="page-subtitle">Pincode {pincode} · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={exportExcel}
              disabled={!!exporting}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Download size={14} /> {exporting === 'excel' ? 'Exporting…' : 'Excel'}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={exportPDF}
              disabled={!!exporting}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <FileText size={14} /> {exporting === 'pdf' ? 'Exporting…' : 'PDF'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 var(--space-5) var(--space-5)' }}>
        {/* Today Summary */}
        <h3 style={{ marginBottom: 'var(--space-3)' }}>📅 Today</h3>
        <div className="stat-grid" style={{ marginBottom: 'var(--space-5)' }}>
          {[
            { value: stats?.todayCreated || 0, label: 'Created', color: 'var(--color-primary)' },
            { value: stats?.todayPending || 0, label: 'Pending', color: 'var(--color-accent)' },
            { value: stats?.todayCompleted || 0, label: 'Completed', color: 'var(--color-success)' },
            { value: stats?.totalCancelled || 0, label: 'Cancelled', color: 'var(--color-danger)' },
          ].map(({ value, label, color }) => (
            <div key={label} className="stat-card">
              <div className="stat-value" style={{ color }}>{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Category Breakdown */}
        {stats?.categories && Object.keys(stats.categories).length > 0 && (
          <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
            <h4 style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart2 size={18} color="var(--color-primary)" /> Category Breakdown
            </h4>
            {Object.entries(stats.categories).map(([type, count]) => (
              <MiniBar
                key={type}
                label={categoryLabel[type] || type}
                value={count}
                max={stats.categoryMax}
                color="var(--color-primary)"
              />
            ))}
          </div>
        )}

        {/* Vulnerable Seniors Alert */}
        {vulnerableSeniors.length > 0 && (
          <div className="card" style={{ marginBottom: 'var(--space-4)', border: '2px solid var(--color-danger)', background: 'var(--color-danger-bg)' }}>
            <h4 style={{ marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-danger)' }}>
              <AlertTriangle size={18} /> ⚠️ Vulnerable Seniors ({vulnerableSeniors.length})
            </h4>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
              These seniors have had 0 activity in the last 7 days. Please check in.
            </p>
            {vulnerableSeniors.map((s) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-border)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{s.name}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{s.area} · {s.phone || 'No phone'}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Volunteer Report */}
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <h4 style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} color="var(--color-success)" /> Volunteer Performance
          </h4>
          {volunteerReport.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No volunteers in this pincode yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-xs)' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    {['Volunteer', 'Hours', 'Tasks', 'Accept%', 'Complete%', 'Rating'].map((h) => (
                      <th key={h} style={{ padding: '8px 6px', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {volunteerReport.map((v) => (
                    <tr key={v.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '8px 6px', fontWeight: 600 }}>{v.name}</td>
                      <td style={{ padding: '8px 6px', color: 'var(--color-primary)', fontWeight: 700 }}>{formatMinutes(v.totalHours)}</td>
                      <td style={{ padding: '8px 6px' }}>{v.completeCount}</td>
                      <td style={{ padding: '8px 6px' }}>{v.acceptPct}%</td>
                      <td style={{ padding: '8px 6px' }}>{v.completePct}%</td>
                      <td style={{ padding: '8px 6px' }}>
                        <span style={{ fontWeight: 700, color: (v.rating || 5) >= 3.5 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          ⭐ {(v.rating || 0).toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
