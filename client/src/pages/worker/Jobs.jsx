import { useCallback, useEffect, useState } from 'react';
import { listWorkerBookings, completeBooking } from '../../api/bookings.js';
import { listServices } from '../../api/services.js';
import { useToast } from '../../components/Toast.jsx';
import { Card } from '../../components/Card.jsx';
import { StatusPill } from '../../components/StatusPill.jsx';
import { MoneyText } from '../../components/MoneyText.jsx';
import { Button } from '../../components/Button.jsx';
import { Pager } from '../../components/Pager.jsx';
import { SkeletonList } from '../../components/Skeleton.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';
import { formatDate } from '../../lib/format.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'completed', label: 'Completed' },
  { value: 'declined', label: 'Declined' },
];

export default function Jobs() {
  const { showToast } = useToast();
  const [services, setServices] = useState([]);
  const [filters, setFilters] = useState({ status: '', service_id: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ status: 'loading', data: [], total: 0, pageSize: 20 });
  const [completingId, setCompletingId] = useState(null);

  useEffect(() => {
    listServices()
      .then(setServices)
      .catch(() => showToast('Could not load the service filter list.', 'error'));
  }, [showToast]);

  const load = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }));
    const params = { page };
    if (filters.status) params.status = filters.status;
    if (filters.service_id) params.service_id = filters.service_id;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;

    listWorkerBookings(params)
      .then((res) => setState({ status: 'ready', data: res.data, total: res.total, pageSize: res.page_size }))
      .catch(() => setState((s) => ({ ...s, status: 'error' })));
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  function updateFilter(key, value) {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  }

  async function handleComplete(bookingId) {
    setCompletingId(bookingId);
    try {
      await completeBooking(bookingId);
      showToast('Job marked complete - earning added to your wallet.', 'success');
      load();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Could not mark this job complete.', 'error');
      if (err.response?.data?.error?.code === 'INVALID_TRANSITION') load();
    } finally {
      setCompletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-display font-bold text-gs-teal-900">My Jobs</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <select
          aria-label="Filter by status"
          value={filters.status}
          onChange={(e) => updateFilter('status', e.target.value)}
          className="min-h-[48px] px-3 rounded-xl border border-gs-teal-100 focus:border-gs-teal-600 outline-none text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by service"
          value={filters.service_id}
          onChange={(e) => updateFilter('service_id', e.target.value)}
          className="min-h-[48px] px-3 rounded-xl border border-gs-teal-100 focus:border-gs-teal-600 outline-none text-sm"
        >
          <option value="">All services</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          aria-label="From date"
          value={filters.from}
          onChange={(e) => updateFilter('from', e.target.value)}
          className="min-h-[48px] px-3 rounded-xl border border-gs-teal-100 focus:border-gs-teal-600 outline-none text-sm"
        />
        <input
          type="date"
          aria-label="To date"
          value={filters.to}
          onChange={(e) => updateFilter('to', e.target.value)}
          className="min-h-[48px] px-3 rounded-xl border border-gs-teal-100 focus:border-gs-teal-600 outline-none text-sm"
        />
      </div>

      {state.status === 'loading' && <SkeletonList rows={4} rowClassName="h-24" />}

      {state.status === 'error' && <ErrorState message="Couldn't load your jobs." onRetry={load} />}

      {state.status === 'ready' && state.data.length === 0 && (
        <EmptyState title="No jobs found" description="No jobs match these filters yet." />
      )}

      {state.status === 'ready' && state.data.length > 0 && (
        <div className="space-y-3">
          {state.data.map((booking) => (
            <Card key={booking.id} className="flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="font-semibold text-gs-ink truncate">{booking.service_name}</p>
                <p className="text-sm text-gs-muted">
                  {booking.customer_name} &middot; {formatDate(booking.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <MoneyText paise={booking.worker_earning_paise} className="font-semibold text-gs-ink" />
                <StatusPill status={booking.status} />
                {booking.status === 'accepted' && (
                  <Button
                    variant="primary"
                    className="min-h-[44px] px-4"
                    disabled={completingId === booking.id}
                    onClick={() => handleComplete(booking.id)}
                  >
                    {completingId === booking.id ? 'Marking...' : 'Mark complete'}
                  </Button>
                )}
              </div>
            </Card>
          ))}
          <Pager page={page} pageSize={state.pageSize} total={state.total} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
