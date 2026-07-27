import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Circle } from 'lucide-react';
import { getCustomerBookingDetail, cancelBooking } from '../../api/bookings.js';
import { useToast } from '../../components/Toast.jsx';
import { Card } from '../../components/Card.jsx';
import { MoneyText } from '../../components/MoneyText.jsx';
import { StatusPill } from '../../components/StatusPill.jsx';
import { Rating } from '../../components/Rating.jsx';
import { Button } from '../../components/Button.jsx';
import { Skeleton } from '../../components/Skeleton.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';
import { formatDateTime } from '../../lib/format.js';

function buildTimeline(booking) {
  const steps = [{ label: 'Booked', at: booking.created_at, done: true }];
  if (booking.status === 'declined') {
    steps.push({ label: 'Declined', at: booking.declined_at, done: true, negative: true, note: booking.decline_reason });
  } else if (booking.status === 'cancelled') {
    steps.push({ label: 'Cancelled', at: booking.cancelled_at, done: true, negative: true });
  } else {
    steps.push({ label: 'Accepted', at: booking.accepted_at, done: Boolean(booking.accepted_at) });
    steps.push({ label: 'Completed', at: booking.completed_at, done: Boolean(booking.completed_at) });
  }
  return steps;
}

function TimelineStep({ label, at, done, negative, note, isLast }) {
  const Icon = negative ? XCircle : done ? CheckCircle2 : Circle;
  const colorClass = negative ? 'text-gs-danger' : done ? 'text-gs-online' : 'text-gs-muted';
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <Icon size={20} className={colorClass} aria-hidden="true" />
        {!isLast && <div className={`w-0.5 flex-1 my-1 ${done || negative ? 'bg-gs-online' : 'bg-gs-teal-100'}`} />}
      </div>
      <div className="pb-4 min-w-0">
        <p className={`font-semibold ${negative ? 'text-gs-danger' : 'text-gs-ink'}`}>{label}</p>
        <p className="text-sm text-gs-muted">{at ? formatDateTime(at) : 'Waiting'}</p>
        {note && <p className="text-sm text-gs-muted mt-1">Reason: {note}</p>}
      </div>
    </div>
  );
}

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [state, setState] = useState({ status: 'loading', booking: null });
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(() => {
    setState({ status: 'loading', booking: null });
    getCustomerBookingDetail(id)
      .then((booking) => setState({ status: 'ready', booking }))
      .catch(() => setState({ status: 'error', booking: null }));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCancel() {
    setCancelling(true);
    try {
      await cancelBooking(id);
      showToast('Booking cancelled and refunded.', 'success');
      load();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Could not cancel this booking.', 'error');
    } finally {
      setCancelling(false);
    }
  }

  if (state.status === 'loading') {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  if (state.status === 'error' || !state.booking) {
    return <ErrorState message="Couldn't load this booking." onRetry={load} />;
  }

  const booking = state.booking;
  const steps = buildTimeline(booking);
  const canCancel = booking.status === 'pending';
  const canRate = booking.status === 'completed' && !booking.review_id;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-display font-bold text-gs-teal-900">{booking.service_name}</h1>
        <StatusPill status={booking.status} />
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gs-muted">Worker</span>
          <span className="font-semibold text-gs-ink flex items-center gap-2">
            {booking.worker_name} <Rating value={Number(booking.worker_rating_avg)} size={12} />
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gs-muted">Area</span>
          <span className="font-semibold text-gs-ink">{booking.area_name}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-gs-muted shrink-0">Address</span>
          <span className="font-semibold text-gs-ink text-right">{booking.address_text}</span>
        </div>
        <div className="flex items-center justify-between border-t border-gs-teal-100 pt-3">
          <span className="text-sm text-gs-muted">Price</span>
          <MoneyText paise={booking.price_paise} className="text-lg font-bold text-gs-teal-900" />
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-gs-ink mb-4">Status</h2>
        {steps.map((step, i) => (
          <TimelineStep key={step.label} {...step} isLast={i === steps.length - 1} />
        ))}
      </Card>

      {booking.review_id && (
        <Card>
          <h2 className="text-sm font-semibold text-gs-ink mb-2">Your rating</h2>
          <Rating value={booking.review_rating} size={20} />
          {booking.review_comment && <p className="text-sm text-gs-muted mt-2">{booking.review_comment}</p>}
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {canCancel && (
          <Button variant="danger" fullWidth disabled={cancelling} onClick={handleCancel}>
            {cancelling ? 'Cancelling...' : 'Cancel booking'}
          </Button>
        )}
        {canRate && (
          <Button variant="primary" fullWidth onClick={() => navigate(`/customer/bookings/${id}/rate`)}>
            Rate this job
          </Button>
        )}
      </div>
    </div>
  );
}
