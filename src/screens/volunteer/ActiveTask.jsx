import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatMinutes, SERVICE_ICONS, SERVICE_LABELS, REQUEST_STATUS } from '../../constants';
import Modal from '../../components/common/Modal';
function PinEntry({ expectedPin, onSuccess, onCancel, title }) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  function handleDigit(idx, val) {
    if (!/^\d?$/.test(val)) return;
    const next = [...pin];
    next[idx] = val;
    setPin(next);
    if (val && idx < 3) {
      document.getElementById(`pin-input-${idx + 1}`)?.focus();
    }
  }
  function handleVerify() {
    const entered = pin.join('');
    if (entered === expectedPin) {
      onSuccess();
    } else {
      setError('Incorrect PIN. Please ask the senior for their 4-digit PIN.');
      setPin(['', '', '', '']);
      document.getElementById('pin-input-0')?.focus();
    }
  }
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}></div>
      <h3 style={{ marginBottom: 'var(--space-2)' }}>{title || 'Enter Verification PIN'}</h3>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)' }}>
        Ask the senior for their 4-digit Time Bank PIN to verify this session.
      </p>
      <div className="pin-inputs">
        {pin.map((digit, idx) => (
          <input
            key={idx}
            id={`pin-input-${idx}`}
            type="password"
            inputMode="numeric"
            maxLength={1}
            className="pin-input"
            value={digit}
            onChange={(e) => handleDigit(idx, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !digit && idx > 0) {
                document.getElementById(`pin-input-${idx - 1}`)?.focus();
              }
            }}
            autoFocus={idx === 0}
          />
        ))}
      </div>
      {error && <p style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>{error}</p>}
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <button className="btn btn-ghost" onClick={onCancel} style={{ flex: 1 }}>Cancel</button>
        <button className="btn btn-primary" onClick={handleVerify} disabled={pin.some((d) => d === '')} style={{ flex: 2 }}>
          Verify PIN
        </button>
      </div>
    </div>
  );
}
function QRVerification({ onSuccess, onCancel }) {
  const [scanning, setScanning] = useState(false);
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}></div>
      <h3 style={{ marginBottom: 'var(--space-2)' }}>Scan QR Code</h3>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)' }}>
        Ask the senior to show their QR code from the app.
      </p>
      <div className="qr-mock">
        <div className="qr-pattern" />
        <div style={{ position: 'absolute', fontSize: '1.5rem' }}></div>
      </div>
      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        Camera access required. In this prototype, tap "Simulate Scan" to proceed.
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <button className="btn btn-ghost" onClick={onCancel} style={{ flex: 1 }}>Cancel</button>
        <button className="btn btn-success" onClick={() => { setScanning(true); setTimeout(onSuccess, 1500); }} style={{ flex: 2 }} disabled={scanning}>
          {scanning ? '✓ Scanning…' : 'Simulate Scan'}
        </button>
      </div>
    </div>
  );
}
function ElapsedTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return (
    <div className="session-timer">
      {h > 0 && `${h}:`}{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </div>
  );
}
export default function ActiveTask() {
  const { getVolunteerActiveRequest, getOpenRequests, startSession, endSession, acceptRequest, requests, activeSession, currentUser } = useApp();
  const navigate = useNavigate();
  const activeRequest = getVolunteerActiveRequest();
  const openRequests = getOpenRequests();
  const [verifyModal, setVerifyModal] = useState(null);
  const [verifyMethod, setVerifyMethod] = useState('pin');
  const [pendingAction, setPendingAction] = useState(null);
  const [pickRequestModal, setPickRequestModal] = useState(false);
  const [acceptedRequest, setAcceptedRequest] = useState(null);
  const acceptedPending = requests.find(
    (r) => r.assignedVolunteerId === currentUser?.id && r.status === REQUEST_STATUS.ACCEPTED
  );
  const targetReq = activeRequest || acceptedPending;
  const seniorPin = '4521';
  function initiateStart() {
    setPendingAction('start');
    setVerifyModal('verify');
  }
  function initiateEnd() {
    setPendingAction('end');
    setVerifyModal('verify');
  }
  function handleVerifySuccess() {
    setVerifyModal(null);
    if (pendingAction === 'start' && targetReq) {
      startSession(targetReq.id);
    } else if (pendingAction === 'end' && activeRequest) {
      endSession(activeRequest.id);
    }
    setPendingAction(null);
  }
  if (!targetReq && !activeRequest) {
    return (
      <div className="page-content">
        <div className="page-header">
          <h2 className="page-title">Active Task</h2>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon"></div>
          <h3>No Active Task</h3>
          <p style={{ fontSize: 'var(--font-size-sm)' }}>Browse nearby requests to find someone to help.</p>
          <button className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }} onClick={() => navigate('/volunteer/nearby')}>
            Browse Requests
          </button>
        </div>
      </div>
    );
  }
  const req = activeRequest || targetReq;
  const isActive = !!activeSession;
  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-inner">
          <h2 className="page-title">{isActive ? 'Session In Progress' : 'Task Accepted'}</h2>
          {isActive && <span className="badge badge-status-in-progress" style={{ animation: 'pulse 2s infinite' }}>● Live</span>}
        </div>
      </div>
      <div style={{ padding: 'var(--space-5)' }}>
        <div className="card" style={{ marginBottom: 'var(--space-4)', borderLeft: '4px solid var(--color-primary)' }}>
          <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-3)' }}>
            <span style={{ fontSize: '2rem' }}>{SERVICE_ICONS[req.serviceType]}</span>
            <div>
              <h3>{SERVICE_LABELS[req.serviceType]}</h3>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                for <strong>{req.seniorName}</strong>
              </div>
            </div>
          </div>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
            {req.description}
          </p>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            {req.location}
          </div>
        </div>
        {isActive && (
          <div style={{ textAlign: 'center', background: 'white', borderRadius: 'var(--radius-xl)', padding: 'var(--space-8)', marginBottom: 'var(--space-4)', border: '2px solid var(--color-primary)' }}>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>Session Time</p>
            <ElapsedTimer startTime={activeSession.startTime} />
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
              Time credits are calculated from session start to end.
            </p>
          </div>
        )}
        <div className="alert alert-info" style={{ marginBottom: 'var(--space-5)' }}>
          Verification required at start and end of each session. This protects both the senior and volunteer.
        </div>
        {!isActive ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', textAlign: 'center' }}>
              Arrived at {req.seniorName}'s location? Start the session.
            </p>
            <button className="btn btn-success btn-full btn-lg" onClick={initiateStart}>
              Start Session
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', textAlign: 'center' }}>
              Task completed? End session to credit your time.
            </p>
            <button className="btn btn-danger btn-full btn-lg" onClick={initiateEnd}>
              ■ End Session & Claim Time
            </button>
          </div>
        )}
        {/* Verification method modal */}
        <Modal isOpen={verifyModal === 'verify'} onClose={() => setVerifyModal(null)} title="Choose Verification Method">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
              {pendingAction === 'start' ? 'Verify session start' : 'Verify session end'} with the senior.
            </p>
            <button
              className="btn btn-primary btn-full"
              onClick={() => setVerifyModal('pin')}
            >
              Enter 4-Digit PIN
            </button>
            <button
              className="btn btn-outline btn-full"
              onClick={() => setVerifyModal('qr')}
            >
              Scan QR Code
            </button>
          </div>
        </Modal>
        <Modal isOpen={verifyModal === 'pin'} onClose={() => setVerifyModal(null)} title="">
          <PinEntry
            expectedPin={seniorPin}
            onSuccess={handleVerifySuccess}
            onCancel={() => setVerifyModal(null)}
            title={pendingAction === 'start' ? 'Verify Session Start' : 'Verify Session End'}
          />
        </Modal>
        <Modal isOpen={verifyModal === 'qr'} onClose={() => setVerifyModal(null)} title="">
          <QRVerification
            onSuccess={handleVerifySuccess}
            onCancel={() => setVerifyModal(null)}
          />
        </Modal>
      </div>
    </div>
  );
}
