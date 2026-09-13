import { useState } from 'react';
import { Award, Download, Heart, Calendar } from 'lucide-react';
import { formatMinutes } from '../../constants';

export default function SevaSummaryCard({ user, requests = [] }) {
  const [downloading, setDownloading] = useState(false);

  const now = new Date();
  const currentMonthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Calculate monthly completed tasks
  const thisMonthRequests = (requests || []).filter((r) => {
    if (r.status !== 'completed') return false;
    const d = new Date(r.completed_at || r.completedAt || r.created_at || r.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const monthMinutes = thisMonthRequests.reduce((acc, r) => acc + (r.duration || 60), 0);
  const totalCompleted = thisMonthRequests.length;
  const uniqueSeniors = new Set(thisMonthRequests.map((r) => r.senior_id || r.seniorId).filter(Boolean)).size;

  const handleDownloadCertificate = async () => {
    setDownloading(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // Border & Background
      doc.setDrawColor(243, 156, 18);
      doc.setLineWidth(4);
      doc.rect(10, 10, 277, 190);
      doc.setDrawColor(39, 174, 96);
      doc.setLineWidth(1);
      doc.rect(14, 14, 269, 182);

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.setTextColor(30, 41, 59);
      doc.text('TIME BANK OF INDIA', 148.5, 40, { align: 'center' });

      doc.setFontSize(16);
      doc.setTextColor(243, 156, 18);
      doc.text('CERTIFICATE OF SEVA & APPRECIATION', 148.5, 52, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(13);
      doc.setTextColor(100, 116, 139);
      doc.text('This certificate is proudly awarded to', 148.5, 75, { align: 'center' });

      // Volunteer Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(24, 43, 73);
      doc.text(user?.name || 'Dedicated Volunteer', 148.5, 92, { align: 'center' });

      // Description
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(71, 85, 105);
      const desc = `In grateful recognition of invaluable volunteer service and community care during ${currentMonthName}.`;
      doc.text(desc, 148.5, 110, { align: 'center' });

      // Impact summary
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(39, 174, 96);
      const impact = `Completed ${totalCompleted} Seva tasks · Provided ${formatMinutes(monthMinutes || user?.time_balance || 60)} of community support`;
      doc.text(impact, 148.5, 124, { align: 'center' });

      // Signatures
      doc.setDrawColor(200, 200, 200);
      doc.line(40, 160, 100, 160);
      doc.line(197, 160, 257, 160);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text('Authorized Signatory', 70, 166, { align: 'center' });
      doc.text('Time Bank of India', 70, 171, { align: 'center' });

      doc.text(new Date().toLocaleDateString('en-IN', { dateStyle: 'long' }), 227, 166, { align: 'center' });
      doc.text('Date of Issue', 227, 171, { align: 'center' });

      doc.save(`TBI_Seva_Certificate_${(user?.name || 'Volunteer').replace(/\s+/g, '_')}_${now.getMonth() + 1}_${now.getFullYear()}.pdf`);
    } catch (err) {
      console.error('[SevaSummaryCard] Certificate generation failed:', err);
      alert('Could not generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="card"
      style={{
        background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
        color: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        marginBottom: 'var(--space-4)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Award size={20} color="#F39C12" />
          <span style={{ fontWeight: 700, fontSize: 'var(--font-size-base)', color: '#FFFFFF' }}>
            Monthly Seva Card
          </span>
        </div>
        <span style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Calendar size={12} /> {currentMonthName}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center', margin: '14px 0' }}>
        <div style={{ background: 'rgba(255,255,255,0.08)', padding: '10px 6px', borderRadius: 8 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#F39C12' }}>
            {formatMinutes(monthMinutes || user?.time_balance || 0)}
          </div>
          <div style={{ fontSize: '0.7rem', opacity: 0.75, marginTop: 2 }}>Seva Time</div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.08)', padding: '10px 6px', borderRadius: 8 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#27AE60' }}>
            {totalCompleted || user?.volunteerStats?.tasksCompleted || 0}
          </div>
          <div style={{ fontSize: '0.7rem', opacity: 0.75, marginTop: 2 }}>Tasks Done</div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.08)', padding: '10px 6px', borderRadius: 8 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#3498DB' }}>
            {uniqueSeniors || user?.volunteerStats?.peopleHelped || 0}
          </div>
          <div style={{ fontSize: '0.7rem', opacity: 0.75, marginTop: 2 }}>Seniors Helped</div>
        </div>
      </div>

      <button
        className="btn btn-full"
        onClick={handleDownloadCertificate}
        disabled={downloading}
        style={{
          background: 'linear-gradient(135deg, #F39C12 0%, #E67E22 100%)',
          color: '#FFFFFF',
          border: 'none',
          fontWeight: 700,
          fontSize: 'var(--font-size-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderRadius: 8,
          padding: '10px 16px',
          cursor: 'pointer',
        }}
      >
        <Download size={16} />
        {downloading ? 'Generating PDF...' : 'Download Seva Certificate (PDF)'}
      </button>
    </div>
  );
}
