import { useState } from 'react';
export default function StarRating({ value = 0, onChange, readonly = false, size = 'md' }) {
  const [hovered, setHovered] = useState(0);
  const fontSize = size === 'lg' ? '2rem' : size === 'sm' ? '1rem' : '1.4rem';
  return (
    <div className="stars" role="group" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || value);
        return (
          <span
            key={star}
            className="star"
            style={{ fontSize, color: filled ? '#F39C12' : '#D5D8DC', cursor: readonly ? 'default' : 'pointer' }}
            onClick={() => !readonly && onChange?.(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(0)}
            role={readonly ? undefined : 'button'}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
          >
            ★
          </span>
        );
      })}
    </div>
  );
}
