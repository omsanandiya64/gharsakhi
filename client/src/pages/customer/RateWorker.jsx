import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { getCustomerBookingDetail, reviewBooking } from '../../api/bookings.js';
import { useToast } from '../../components/Toast.jsx';
import { Card } from '../../components/Card.jsx';
import { Rating } from '../../components/Rating.jsx';
import { Button } from '../../components/Button.jsx';
import { Skeleton } from '../../components/Skeleton.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';

export default function RateWorker() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loadState, setLoadState] = useState({ status: 'loading', booking: null });
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoadState({ status: 'loading', booking: null });
    getCustomerBookingDetail(id)
      .then((booking) => setLoadState({ status: 'ready', booking }))
      .catch(() => setLoadState({ status: 'error', booking: null }));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

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

  if (loadState.status === 'loading') {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  if (loadState.status === 'error' || !loadState.booking) {
    return <ErrorState message="Couldn't load this booking." onRetry={load} />;
  }

  const booking = loadState.booking;

  // Not eligible to rate (not completed, or already reviewed - e.g. reached via
  // a stale link, a booking that isn't theirs, or a race with another review) -
  // bounce to the detail page rather than showing a rating form for nothing.
  if (booking.status !== 'completed' || booking.review_id) {
    return <Navigate to={`/customer/bookings/${id}`} replace />;
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-display font-bold text-gs-teal-900">Rate your experience</h1>
        <p className="text-sm text-gs-muted">
          {booking.service_name} with {booking.worker_name}
        </p>
      </div>

      <Card className="flex flex-col items-center gap-4 py-8">
        <Rating
          value={rating}
          interactive
          size={32}
          onChange={(v) => {
            setRating(v);
            setError('');
          }}
        />
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
