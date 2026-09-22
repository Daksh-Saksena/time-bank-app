import { useState } from 'react';
import { Award, Download, Calendar } from 'lucide-react';
import { formatMinutes } from '../../constants';
import { useApp } from '../../context/AppContext';

export default function SevaSummaryCard({ user }) {
  const { getVolunteerMetrics } = useApp();
  const [downloading, setDownloading] = useState(false);

  const metrics = getVolunteerMetrics(user?.id);
  const now = new Date();
  const currentMonthName = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  const sevaTimeToDisplay = metrics.thisMonthMinutes > 0
    ? metrics.thisMonthMinutes
    : metrics.totalSevaMinutes;

  const tasksToDisplay = metrics.thisMonthTasks > 0
    ? metrics.thisMonthTasks
    : metrics.tasksCompleted;

  const handleDownloadCertificate = async () => {
    setDownloading(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // Outer & Inner Borders
      doc.setDrawColor(243, 156, 18);
      doc.setLineWidth(4);
      doc.rect(10, 10, 277, 190);
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(1);
      doc.rect(14, 14, 269, 182);

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.setTextColor(30, 58, 138);
      doc.text('TIME BANK OF INDIA', 148.5, 38, { align: 'center' });

      doc.setFontSize(16);
      doc.setTextColor(243, 156, 18);
      doc.text('CERTIFICATE OF SEVA & APPRECIATION', 148.5, 50, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(13);
      doc.setTextColor(100, 116, 139);
      doc.text('This certificate of gratitude is proudly awarded to', 148.5, 72, { align: 'center' });

      // Volunteer Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(15, 23, 42);
      doc.text(user?.name || 'Dedicated Sevak', 148.5, 88, { align: 'center' });

      // Description
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(71, 85, 105);
      const desc = `In grateful recognition of pure voluntary service and selfless community care during ${currentMonthName}.`;
      doc.text(desc, 148.5, 106, { align: 'center' });

      // Impact summary generated strictly from real records
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(22, 163, 74);
      const impact = `Completed ${tasksToDisplay} Seva Tasks · Contributed ${formatMinutes(sevaTimeToDisplay)} of Voluntary Care`;
      doc.text(impact, 148.5, 122, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139);
      doc.text(`Location: ${user?.area || 'Local Area'} · Pincode: ${user?.pincode || '400001'}`, 148.5, 134, { align: 'center' });

      // Signatures
      doc.setDrawColor(203, 213, 225);
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
      console.error('[SevaSummaryCard] Certificate generation error:', err);
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
          <Award size={20} color="#F59E0B" />
          <span style={{ fontWeight: 800, fontSize: 'var(--font-size-base)', color: '#FFFFFF' }}>
            मासिक सेवा पत्र (Monthly Seva Card)
          </span>
        </div>
        <span style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Calendar size={12} /> {currentMonthName}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center', margin: '14px 0' }}>
        <div style={{ background: 'rgba(255,255,255,0.08)', padding: '10px 6px', borderRadius: 8 }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F59E0B' }}>
            {formatMinutes(sevaTimeToDisplay)}
          </div>
          <div style={{ fontSize: '0.72rem', opacity: 0.8, marginTop: 2 }}>Seva Time</div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.08)', padding: '10px 6px', borderRadius: 8 }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10B981' }}>
            {tasksToDisplay}
          </div>
          <div style={{ fontSize: '0.72rem', opacity: 0.8, marginTop: 2 }}>Tasks Done</div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.08)', padding: '10px 6px', borderRadius: 8 }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#60A5FA' }}>
            {metrics.peopleHelped}
          </div>
          <div style={{ fontSize: '0.72rem', opacity: 0.8, marginTop: 2 }}>Seniors Helped</div>
        </div>
      </div>

      <button
        className="btn btn-full"
        onClick={handleDownloadCertificate}
        disabled={downloading}
        style={{
          background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
          color: '#FFFFFF',
          border: 'none',
          fontWeight: 800,
          fontSize: 'var(--font-size-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderRadius: 8,
          padding: '12px 16px',
          cursor: 'pointer',
        }}
      >
        <Download size={16} />
        {downloading ? 'प्रमाणपत्र तैयार हो रहा है…' : 'सेवा प्रमाणपत्र डाउनलोड करें (PDF)'}
      </button>
    </div>
  );
}
