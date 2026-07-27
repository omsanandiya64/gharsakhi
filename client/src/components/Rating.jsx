import { Star } from 'lucide-react';

export function Rating({ value = 0, count, size = 18, interactive = false, onChange }) {
  const stars = [1, 2, 3, 4, 5];
  const rounded = Math.round(Number(value) || 0);

  if (interactive) {
    return (
      <div role="radiogroup" aria-label="Rating" className="inline-flex items-center gap-1">
        {stars.map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === rounded}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            onClick={() => onChange?.(star)}
            className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg hover:bg-gs-teal-100"
          >
            <Star
              size={size * 1.6}
              aria-hidden="true"
              className={star <= rounded ? 'fill-gs-marigold text-gs-marigold' : 'text-gs-muted'}
            />
          </button>
        ))}
      </div>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1"
      aria-label={`Rated ${value} out of 5 stars${count != null ? ` from ${count} reviews` : ''}`}
    >
      {stars.map((star) => (
        <Star
          key={star}
          size={size}
          aria-hidden="true"
          className={star <= rounded ? 'fill-gs-marigold text-gs-marigold' : 'text-gs-teal-100'}
        />
      ))}
      {count != null && <span className="ml-1 text-sm text-gs-muted">({count})</span>}
    </span>
  );
}
