import { useEffect } from 'react';
export default function Modal({ isOpen, onClose, children, center = false, title }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);
  if (!isOpen) return null;
  return (
    <div
      className={`modal-overlay${center ? ' center' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Dialog'}
    >
      {center ? (
        <div className="modal-center">
          {title && <h3 style={{ marginBottom: 'var(--space-4)' }}>{title}</h3>}
          {children}
        </div>
      ) : (
        <div className="modal-sheet">
          <div className="modal-handle" />
          {title && <h3 style={{ marginBottom: 'var(--space-4)' }}>{title}</h3>}
          {children}
        </div>
      )}
    </div>
  );
}
