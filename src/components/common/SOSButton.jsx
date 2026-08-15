import { useState } from 'react';
import Modal from './Modal';
import { useApp } from '../../context/AppContext';
export function SOSButton() {
  const { sosVisible, setSosVisible } = useApp();
  return (
    <>
      <button
        className="sos-btn"
        aria-label="Emergency SOS"
        onClick={() => setSosVisible(true)}
      >
        <span style={{ fontSize: '1.2rem' }}></span>
        <span>SOS</span>
      </button>
      <SOSModal isOpen={sosVisible} onClose={() => setSosVisible(false)} />
    </>
  );
}
export function SOSModal({ isOpen, onClose }) {
  const { currentUser } = useApp();
  const [confirmed, setConfirmed] = useState(false);
  function handleCall(phone) {
    window.location.href = `tel:${phone.replace(/\s/g, '')}`;
  }
  return (
    <Modal isOpen={isOpen} onClose={onClose} center title="">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}></div>
        <h2 style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-2)' }}>Emergency SOS</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-5)', fontSize: 'var(--font-size-sm)' }}>
          This is a prototype. In production, an alert would be sent to your emergency contacts and local coordinators.
        </p>
        <div
          className="alert alert-danger"
          style={{ marginBottom: 'var(--space-4)', textAlign: 'left' }}
        >
          This does NOT connect to real emergency services. For real emergencies, call <strong>112</strong>.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <button className="btn btn-danger btn-full btn-lg" onClick={() => handleCall('112')}>
            Call Emergency Services (112)
          </button>
          {currentUser?.emergencyContact && (
            <button
              className="btn btn-outline btn-full"
              onClick={() => handleCall(currentUser.emergencyContact.phone)}
              style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
            >
              Call {currentUser.emergencyContact.name}
              <br />
              <small style={{ fontWeight: 400 }}>{currentUser.emergencyContact.phone}</small>
            </button>
          )}
          <button className="btn btn-ghost btn-full" onClick={() => handleCall('1800-111-555')}>
            Time Bank Helpline (1800-111-555)
          </button>
          <button
            className="btn btn-ghost btn-full"
            onClick={onClose}
            style={{ marginTop: 'var(--space-2)' }}
          >
            Cancel - I am safe
          </button>
        </div>
      </div>
    </Modal>
  );
}
