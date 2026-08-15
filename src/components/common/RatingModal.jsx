import { useState } from 'react';
import Modal from './Modal';
import StarRating from './StarRating';
import { useApp } from '../../context/AppContext';
import { ROLES } from '../../data/mockData';
export default function RatingModal() {
  const { pendingRating, dismissRating, submitRating, currentUser, requests } = useApp();
  const [stars, setStars] = useState(0);
  const [review, setReview] = useState('');
  if (!pendingRating) return null;
  const req = requests.find((r) => r.id === pendingRating.requestId);
  if (!req) return null;
  const isVolunteer = currentUser?.role === ROLES.VOLUNTEER;
  const revieweeName = isVolunteer ? req.seniorName : req.assignedVolunteerName;
  const revieweeId = isVolunteer ? req.seniorId : req.assignedVolunteerId;
  function handleSubmit() {
    if (stars === 0) return;
    submitRating({ requestId: pendingRating.requestId, stars, review, revieweeId, revieweeName });
    setStars(0);
    setReview('');
  }
  return (
    <Modal isOpen={true} onClose={dismissRating} title="Rate this experience">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}></div>
        <h3 style={{ marginBottom: 'var(--space-2)' }}>
          {isVolunteer ? 'Rate the Senior' : 'Rate your Volunteer'}
        </h3>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)' }}>
          How was your experience with <strong>{revieweeName}</strong>?
        </p>
        <div style={{ marginBottom: 'var(--space-5)', display: 'flex', justifyContent: 'center' }}>
          <StarRating value={stars} onChange={setStars} size="lg" />
        </div>
        <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
          <label className="input-label">Write a review (optional)</label>
          <textarea
            className="input"
            placeholder="Share your experience..."
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={3}
          />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn-ghost" onClick={dismissRating} style={{ flex: 1 }}>
            Skip
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={stars === 0}
            style={{ flex: 2 }}
          >
            Submit Rating
          </button>
        </div>
      </div>
    </Modal>
  );
}
