import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { REQUEST_STATUS, ROLES, formatMinutes, SERVICE_TYPES, SERVICE_LABELS, SERVICE_ICONS } from '../../constants';
import { BarChart2, Users, AlertTriangle, Download, FileText, TrendingUp, ShieldCheck, Filter, Clock } from 'lucide-react';
import { getPincodeLocation } from '../../lib/geo';

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
  const { currentUser, isSuperAdmin, requests, members, ratings, getVolunteerMetrics } = useApp();
  const [selectedPincode, setSelectedPincode] = useState(isSuperAdmin ? 'all' : (currentUser?.pincode || '400001'));
  const [stats, setStats] = useState(null);
  const [vulnerableSeniors, setVulnerableSeniors] = useState([]);
  const [volunteerReport, setVolunteerReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Filter requests based on scope
      const scopedRequests = selectedPincode !== 'all'
        ? requests.filter((r) => r.pincode === selectedPincode)
        : requests;

      const todayRequests = scopedRequests.filter((r) => new Date(r.createdAt || r.created_at) >= today);

      // Category breakdown
      const categories = {};
      scopedRequests.forEach((r) => {
        const st = r.serviceType || 'other';
        categories[st] = (categories[st] || 0) + 1;
      });

      // Volunteer stats derived from getVolunteerMetrics
      const scopedVolunteers = members.filter((m) =>
        (m.role === ROLES.VOLUNTEER || (m.roles || []).includes(ROLES.VOLUNTEER)) &&
        (selectedPincode === 'all' || m.pincode === selectedPincode)
      );

      const volStats = scopedVolunteers.map((v) => {
        const vReqs = scopedRequests.filter((r) => r.assignedVolunteerId === v.id || r.assigned_volunteer_id === v.id);
        const accepted = vReqs.filter((r) => [REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.IN_PROGRESS, REQUEST_STATUS.COMPLETED, REQUEST_STATUS.RATED, REQUEST_STATUS.CLOSED].includes(r.status));
        const completed = vReqs.filter((r) => [REQUEST_STATUS.COMPLETED, REQUEST_STATUS.RATED, REQUEST_STATUS.CLOSED].includes(r.status));
        const metrics = getVolunteerMetrics(v.id);

        return {
          ...v,
          acceptCount: accepted.length,
          completeCount: completed.length,
          totalHours: metrics.totalSevaMinutes,
          acceptPct: vReqs.length > 0 ? Math.round((accepted.length / vReqs.length) * 100) : (accepted.length > 0 ? 100 : 0),
          completePct: accepted.length > 0 ? Math.round((completed.length / accepted.length) * 100) : (completed.length > 0 ? 100 : 0),
          avgRating: metrics.avgRating,
          reviewCount: metrics.reviewCount,
        };
      });

      setVolunteerReport(volStats.sort((a, b) => b.totalHours - a.totalHours));

      // Vulnerable seniors (0 activity in last 14 days)
      const scopedSeniors = members.filter((m) =>
        (m.role === ROLES.SENIOR || (m.roles || []).includes(ROLES.SENIOR)) &&
        (selectedPincode === 'all' || m.pincode === selectedPincode)
      );
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const vulnerable = scopedSeniors.filter((s) => {
        const recentActivity = scopedRequests.filter(
          (r) => (r.seniorId === s.id || r.senior_id === s.id) && new Date(r.createdAt || r.created_at) > fourteenDaysAgo
        );
        return recentActivity.length === 0;
      });
      setVulnerableSeniors(vulnerable);

      setStats({
        todayCreated: todayRequests.length,
        todayPending: todayRequests.filter((r) => r.status === REQUEST_STATUS.OPEN || r.status === REQUEST_STATUS.NOTIFIED_TRUSTED).length,
        todayCompleted: todayRequests.filter((r) => [REQUEST_STATUS.COMPLETED, REQUEST_STATUS.RATED, REQUEST_STATUS.CLOSED].includes(r.status)).length,
        totalCompleted: scopedRequests.filter((r) => [REQUEST_STATUS.COMPLETED, REQUEST_STATUS.RATED, REQUEST_STATUS.CLOSED].includes(r.status)).length,
        totalCancelled: scopedRequests.filter((r) => r.status === REQUEST_STATUS.CANCELLED).length,
        totalSeniors: scopedSeniors.length,
        totalVolunteers: scopedVolunteers.length,
        categories,
        categoryMax: Math.max(...Object.values(categories), 1),
      });
    } finally {
      setLoading(false);
    }
  }, [requests, members, selectedPincode, getVolunteerMetrics]);

  useEffect(() => { loadStats(); }, [loadStats]);

  // ── Export to Excel ───────────────────────────────────────
  async function exportExcel() {
    setExporting('excel');
    try {
      const XLSX = (await import('xlsx')).default;
      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        ['Time Bank of India: Pure Seva Community Report', `Generated: ${new Date().toLocaleDateString('en-IN')}`],
        ['Jurisdiction', selectedPincode === 'all' ? 'All India (Cross-Pincode)' : `Pincode ${selectedPincode}`],
        ['Model', 'Pure Seva (Free voluntary community service, time tracked for gratitude & reporting)'],
        [],
        ['Today Created Requests', stats?.todayCreated],
        ['Today Pending Requests', stats?.todayPending],
        ['Today Completed Requests', stats?.todayCompleted],
        ['Total Completed Sevas (All Time)', stats?.totalCompleted],
        ['Total Cancelled Requests', stats?.totalCancelled],
        ['Total Registered Seniors', stats?.totalSeniors],
        ['Total Active Volunteers', stats?.totalVolunteers],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Summary');

      // Volunteer report sheet
      const volHeaders = ['Volunteer Name', 'Area / Pincode', 'Tasks Accepted', 'Tasks Completed', 'Total Seva Given', 'Accept %', 'Complete %', 'Average Rating', 'Review Count'];
      const volRows = volunteerReport.map((v) => [
        v.name, `${v.area || ''} (${v.pincode || ''})`, v.acceptCount, v.completeCount,
        formatMinutes(v.totalHours), `${v.acceptPct}%`, `${v.completePct}%`, v.avgRating || 'No reviews yet', v.reviewCount
      ]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([volHeaders, ...volRows]), 'Volunteers');

      // Vulnerable seniors sheet
      const vulHeaders = ['Senior Name', 'Phone', 'Area / Pincode', 'Status'];
      const vulRows = vulnerableSeniors.map((s) => [s.name, s.phone || '-', `${s.area || ''} (${s.pincode || ''})`, 'No activity in last 14 days']);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([vulHeaders, ...vulRows]), 'Vulnerable Seniors');

      XLSX.writeFile(wb, `TBI-Seva-Report-${selectedPincode}-${new Date().toISOString().slice(0, 10)}.xlsx`);
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
      doc.text('Time Bank of India: Pure Seva Report', 20, y); y += 9;

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Scope: ${selectedPincode === 'all' ? 'All India (Cross-Pincode)' : `Pincode ${selectedPincode}`} | Generated: ${new Date().toLocaleDateString('en-IN')}`, 20, y); y += 12;

      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0);
      doc.text('Summary Overview', 20, y); y += 7;
      doc.setFontSize(10);
      [
        [`Today Created: ${stats?.todayCreated || 0}`],
        [`Today Pending: ${stats?.todayPending || 0}`],
        [`Today Completed: ${stats?.todayCompleted || 0}`],
        [`Total Completed Sevas: ${stats?.totalCompleted || 0}`],
        [`Total Seniors: ${stats?.totalSeniors || 0}`],
        [`Total Volunteers: ${stats?.totalVolunteers || 0}`],
      ].forEach(([text]) => { doc.text(`  • ${text}`, 20, y); y += 6; });

      y += 6;
      doc.setFontSize(13);
      doc.text('Volunteer Performance & Seva Hours', 20, y); y += 7;
      doc.setFontSize(9);
      volunteerReport.slice(0, 15).forEach((v) => {
        if (y > 270) { doc.addPage(); y = 20; }
        const ratingStr = v.avgRating ? `Rating: ${v.avgRating} (${v.reviewCount})` : 'No reviews yet';
        doc.text(`  ${v.name}: ${formatMinutes(v.totalHours)} seva, Complete: ${v.completePct}%, Rating: ${ratingStr}`, 20, y);
        y += 5.5;
      });

      if (vulnerableSeniors.length > 0) {
        y += 6;
        doc.setFontSize(13);
        doc.text('Vulnerable Seniors (No requests in last 14 days)', 20, y); y += 7;
        doc.setFontSize(9);
        vulnerableSeniors.forEach((s) => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(`  • ${s.name}: ${s.area || '-'} · ${s.phone || 'No phone'}`, 20, y); y += 5.5;
        });
      }

      doc.save(`TBI-Seva-Report-${selectedPincode}-${new Date().toISOString().slice(0, 10)}.pdf`);
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
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <Clock size={32} color="var(--color-text-muted)" />
          </div>
          <p>Generating reports…</p>
        </div>
      </div>
    );
  }

  const currentGeo = getPincodeLocation(currentUser?.pincode, currentUser?.area);

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-inner flex justify-between items-center">
          <div>
            <h2 className="page-title">Seva & Analytics Reports</h2>
            <p className="page-subtitle">
              {selectedPincode === 'all'
                ? 'All India · Cross-Pincode Community Reporting'
                : `Pincode ${selectedPincode} (${currentGeo.full})`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={exportExcel}
              disabled={!!exporting}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
            >
              <Download size={14} /> {exporting === 'excel' ? 'Exporting…' : 'Excel'}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={exportPDF}
              disabled={!!exporting}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
            >
              <FileText size={14} /> {exporting === 'pdf' ? 'Exporting…' : 'PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Super Admin Cross-Pincode Selector */}
      {isSuperAdmin && (
        <div style={{ padding: '0 var(--space-5) var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8FAFC', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)' }}>
            <Filter size={16} color="var(--color-primary)" />
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700 }}>Jurisdiction:</span>
            <select
              className="input"
              style={{ flex: 1, height: 36, padding: '4px 8px' }}
              value={selectedPincode}
              onChange={(e) => setSelectedPincode(e.target.value)}
            >
              <option value="all">All India (All Pincodes Combined)</option>
              <option value="400001">400001: Colaba, Mumbai</option>
              <option value="110001">110001: Connaught Place, New Delhi</option>
              <option value="560001">560001: MG Road, Bengaluru</option>
            </select>
          </div>
        </div>
      )}

      <div style={{ padding: '0 var(--space-5) var(--space-5)' }}>
        {/* Today Summary */}
        <h3 style={{ marginBottom: 'var(--space-3)' }}>Today's Activity</h3>
        <div className="stat-grid" style={{ marginBottom: 'var(--space-5)' }}>
          {[
            { value: stats?.todayCreated || 0, label: 'Created Today', color: 'var(--color-primary)' },
            { value: stats?.todayPending || 0, label: 'Pending Help', color: '#D97706' },
            { value: stats?.todayCompleted || 0, label: 'Completed Sevas', color: '#16A34A' },
            { value: stats?.totalCancelled || 0, label: 'Cancelled', color: '#DC2626' },
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
                label={`${SERVICE_ICONS[type] || '🤝'} ${SERVICE_LABELS[type] || type}`}
                value={`${count} task${count === 1 ? '' : 's'}`}
                max={stats.categoryMax}
                color="var(--color-primary)"
              />
            ))}
          </div>
        )}

        {/* Vulnerable Seniors Alert */}
        {vulnerableSeniors.length > 0 && (
          <div className="card" style={{ marginBottom: 'var(--space-4)', border: '2px solid #F59E0B', background: '#FFFBEB' }}>
            <h4 style={{ marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 8, color: '#B45309' }}>
              <AlertTriangle size={18} /> Vulnerable Seniors Inactivity Alert ({vulnerableSeniors.length})
            </h4>
            <p style={{ fontSize: 'var(--font-size-xs)', color: '#92400E', marginBottom: 'var(--space-3)' }}>
              These seniors have had 0 community requests or contact in the last 14+ days.
            </p>
            {vulnerableSeniors.map((s) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-2) 0', borderBottom: '1px solid #FDE68A' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>{s.name}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{s.area || 'Local Area'} · {s.phone || 'No phone'}</div>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#B45309', fontWeight: 600 }}>Needs check-in</span>
              </div>
            ))}
          </div>
        )}

        {/* Volunteer Performance Table */}
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <h4 style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} color="#16A34A" /> Volunteer Seva Performance
          </h4>
          {volunteerReport.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No volunteer records in this jurisdiction.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-xs)' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    {['Volunteer', 'Seva Given', 'Completed', 'Accept %', 'Complete %', 'Rating'].map((h) => (
                      <th key={h} style={{ padding: '8px 6px', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {volunteerReport.map((v) => (
                    <tr key={v.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '8px 6px', fontWeight: 700 }}>{v.name}</td>
                      <td style={{ padding: '8px 6px', color: '#16A34A', fontWeight: 800 }}>{formatMinutes(v.totalHours)}</td>
                      <td style={{ padding: '8px 6px', fontWeight: 600 }}>{v.completeCount}</td>
                      <td style={{ padding: '8px 6px' }}>{v.acceptPct}%</td>
                      <td style={{ padding: '8px 6px' }}>{v.completePct}%</td>
                      <td style={{ padding: '8px 6px' }}>
                        {v.avgRating ? (
                          <span style={{ fontWeight: 700, color: '#D97706' }}>
                            ⭐ {v.avgRating} ({v.reviewCount})
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                            No reviews yet
                          </span>
                        )}
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
