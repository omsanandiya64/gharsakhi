import { useCallback, useEffect, useState } from 'react';
import { listAdminTransactions } from '../../api/admin.js';
import { ResponsiveTable } from '../../components/ResponsiveTable.jsx';
import { MoneyText } from '../../components/MoneyText.jsx';
import { Pager } from '../../components/Pager.jsx';
import { SkeletonList } from '../../components/Skeleton.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';
import { formatDateTime } from '../../lib/format.js';

const COLUMNS = [
  { key: 'date', label: 'Date', render: (r) => formatDateTime(r.created_at) },
  { key: 'actor', label: 'Actor', render: (r) => (r.actor_name ? `${r.actor_name} (${r.actor})` : r.actor) },
  { key: 'type', label: 'Type' },
  {
    key: 'amount',
    label: 'Amount',
    render: (r) => (
      <MoneyText paise={r.amount_paise} className={r.amount_paise < 0 ? 'text-gs-danger' : 'text-gs-online'} />
    ),
  },
  {
    key: 'balance',
    label: 'Balance after',
    render: (r) => (r.balance_after_paise != null ? <MoneyText paise={r.balance_after_paise} /> : '—'),
  },
  { key: 'note', label: 'Note', render: (r) => r.service_name ?? r.note ?? '—' },
];

export default function Transactions() {
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ status: 'loading', data: [], total: 0, pageSize: 20 });

  const load = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }));
    listAdminTransactions({ page })
      .then((res) => setState({ status: 'ready', data: res.data, total: res.total, pageSize: res.page_size }))
      .catch(() => setState((s) => ({ ...s, status: 'error' })));
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-display font-bold text-gs-teal-900">Transactions</h1>

      {state.status === 'loading' && <SkeletonList rows={6} rowClassName="h-16" />}

      {state.status === 'error' && <ErrorState message="Couldn't load transactions." onRetry={load} />}

      {state.status === 'ready' && state.data.length === 0 && (
        <EmptyState title="No transactions yet" description="The wallet ledger will show up here." />
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
