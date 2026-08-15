import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Modal from '../../components/common/Modal';
export default function SeniorQRModal({ isOpen, onClose }) {
  const { currentUser } = useApp();
  const pin = currentUser?.pin || '0000';
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="My Verification Code">
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-5)' }}>
          Show this to the volunteer when they arrive to start or end a session.
        </p>
        <div style={{
          width: 200, height: 200,
          margin: '0 auto var(--space-5)',
          background: 'white',
          border: '6px solid var(--color-primary)',
          borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 10,
            backgroundImage: 'radial-gradient(circle, #1B4F72 1.5px, transparent 1.5px)',
            backgroundSize: '8px 8px',
            opacity: 0.7,
          }} />
          {[[0, 0], [0, 'auto'], ['auto', 0]].map((pos, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: pos[0] === 0 ? 10 : undefined,
              bottom: pos[0] === 'auto' ? 10 : undefined,
              left: pos[1] === 0 ? 10 : undefined,
              right: pos[1] === 'auto' ? 10 : undefined,
              width: 36, height: 36,
              border: '5px solid #1B4F72',
              borderRadius: 4,
              background: 'white',
            }} />
          ))}
          <div style={{ position: 'relative', zIndex: 1, background: 'white', padding: '4px 8px', borderRadius: 4 }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-primary)' }}>TIME BANK OF INDIA</span>
          </div>
        </div>
        <div style={{ background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>Your 4-Digit PIN</div>
          <div style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '0.4em', color: 'var(--color-primary)' }}>
            {pin}
          </div>
        </div>
        <div className="alert alert-info" style={{ textAlign: 'left', marginBottom: 'var(--space-4)' }}>
          Only share your PIN with a verified Time Bank volunteer when they are present.
        </div>
        <button className="btn btn-ghost btn-full" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}
