import { useCallback, useEffect, useState } from 'react';
import { listAdminBookings } from '../../api/admin.js';
import { ResponsiveTable } from '../../components/ResponsiveTable.jsx';
import { StatusPill } from '../../components/StatusPill.jsx';
import { MoneyText } from '../../components/MoneyText.jsx';
import { Pager } from '../../components/Pager.jsx';
import { SkeletonList } from '../../components/Skeleton.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';
import { formatDate } from '../../lib/format.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const COLUMNS = [
  { key: 'customer_name', label: 'Customer' },
  { key: 'worker_name', label: 'Worker' },
  { key: 'service_name', label: 'Service' },
  { key: 'amount', label: 'Amount', render: (r) => <MoneyText paise={r.price_paise} /> },
  { key: 'status', label: 'Status', render: (r) => <StatusPill status={r.status} /> },
  { key: 'date', label: 'Date', render: (r) => formatDate(r.created_at) },
];

export default function Bookings() {
  const [filters, setFilters] = useState({ status: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ status: 'loading', data: [], total: 0, pageSize: 20 });

  const load = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }));
    const params = { page };
    if (filters.status) params.status = filters.status;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;

    listAdminBookings(params)
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

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-display font-bold text-gs-teal-900">Bookings</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

      {state.status === 'loading' && <SkeletonList rows={5} rowClassName="h-16" />}

      {state.status === 'error' && <ErrorState message="Couldn't load bookings." onRetry={load} />}

      {state.status === 'ready' && state.data.length === 0 && (
        <EmptyState title="No bookings found" description="No bookings match these filters." />
      )}

      {state.status === 'ready' && state.data.length > 0 && (
        <>
          <ResponsiveTable columns={COLUMNS} rows={state.data} />
          <Pager page={page} pageSize={state.pageSize} total={state.total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
