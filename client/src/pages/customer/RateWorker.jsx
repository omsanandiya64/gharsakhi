import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reviewBooking } from '../../api/bookings.js';
import { useToast } from '../../components/Toast.jsx';
import { Card } from '../../components/Card.jsx';
import { Rating } from '../../components/Rating.jsx';
import { Button } from '../../components/Button.jsx';

export default function RateWorker() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (rating < 1) {
      setError('Please select a star rating.');
      return;
    }
    setStatus('loading');
    setError('');
    try {
      await reviewBooking(id, { rating, comment: comment.trim() || undefined });
      showToast('Thanks for rating!', 'success');
      navigate(`/customer/bookings/${id}`);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not submit your rating.');
      setStatus('idle');
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-display font-bold text-gs-teal-900">Rate your experience</h1>

      <Card className="flex flex-col items-center gap-4 py-8">
        <Rating value={rating} interactive size={32} onChange={(v) => { setRating(v); setError(''); }} />
        <p className="text-sm text-gs-muted">Tap a star to rate</p>
      </Card>

      <div>
        <label htmlFor="comment" className="block text-sm font-semibold text-gs-ink mb-1">
          Comment (optional)
        </label>
        <textarea
          id="comment"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gs-teal-100 focus:border-gs-teal-600 outline-none text-base"
        />
      </div>

      {error && (
        <p className="text-sm text-gs-danger" role="alert">
          {error}
        </p>
      )}

      <Button variant="primary" fullWidth disabled={status === 'loading'} onClick={handleSubmit}>
        {status === 'loading' ? 'Submitting...' : 'Submit rating'}
      </Button>
    </div>
  );
}
