import { useCallback, useEffect, useState } from 'react';
import { listAdminWorkers, setAdminWorkerBlocked } from '../../api/admin.js';
import { useToast } from '../../components/Toast.jsx';
import { ResponsiveTable } from '../../components/ResponsiveTable.jsx';
import { MoneyText } from '../../components/MoneyText.jsx';
import { Rating } from '../../components/Rating.jsx';
import { Button } from '../../components/Button.jsx';
import { Pager } from '../../components/Pager.jsx';
import { SkeletonList } from '../../components/Skeleton.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';
import { BlockConfirmModal } from './BlockConfirmModal.jsx';

export default function Workers() {
  const { showToast } = useToast();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ status: 'loading', data: [], total: 0, pageSize: 20 });
  const [target, setTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }));
    const params = { page };
    if (q) params.q = q;
    listAdminWorkers(params)
      .then((res) => setState({ status: 'ready', data: res.data, total: res.total, pageSize: res.page_size }))
      .catch(() => setState((s) => ({ ...s, status: 'error' })));
  }, [q, page]);

  useEffect(() => {
    load();
  }, [load]);

  function updateSearch(value) {
    setPage(1);
    setQ(value);
  }

  async function handleConfirm() {
    setSubmitting(true);
    const { account, blocking } = target;
    try {
      const updated = await setAdminWorkerBlocked(account.id, blocking);
      setState((s) => ({ ...s, data: s.data.map((w) => (w.id === updated.id ? { ...w, ...updated } : w)) }));
      showToast(blocking ? 'Worker blocked.' : 'Worker unblocked.', 'success');
      setTarget(null);
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Could not update this account.', 'error');
      load();
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    { key: 'name', label: 'Name' },
    {
      key: 'online',
      label: 'Online',
      render: (r) =>
        r.is_online ? (
          <span className="inline-flex items-center gap-1.5 text-gs-online font-semibold">
            <span className="w-2 h-2 rounded-full bg-gs-online" aria-hidden="true" />
            Online
          </span>
        ) : (
          <span className="text-gs-muted">Offline</span>
        ),
    },
    { key: 'rating', label: 'Rating', render: (r) => <Rating value={Number(r.rating_avg)} count={r.rating_count} size={12} /> },
    { key: 'wallet', label: 'Wallet', render: (r) => <MoneyText paise={r.wallet_paise} /> },
    {
      key: 'status',
      label: 'Status',
      render: (r) =>
        r.is_blocked ? (
          <span className="text-gs-danger font-semibold">Blocked</span>
        ) : (
          <span className="text-gs-online font-semibold">Active</span>
        ),
    },
    {
      key: 'action',
      label: '',
      render: (r) => (
        <Button
          variant={r.is_blocked ? 'primary' : 'danger'}
          className="min-h-[40px] px-4"
          onClick={() => setTarget({ account: r, blocking: !r.is_blocked })}
        >
          {r.is_blocked ? 'Unblock' : 'Block'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-display font-bold text-gs-teal-900">Workers</h1>

      <input
        type="search"
        aria-label="Search workers"
        placeholder="Search by name or phone"
        value={q}
        onChange={(e) => updateSearch(e.target.value)}
        className="w-full sm:w-80 min-h-[48px] px-4 rounded-xl border border-gs-teal-100 focus:border-gs-teal-600 outline-none text-base"
      />

      {state.status === 'loading' && <SkeletonList rows={5} rowClassName="h-16" />}

      {state.status === 'error' && <ErrorState message="Couldn't load workers." onRetry={load} />}

      {state.status === 'ready' && state.data.length === 0 && (
        <EmptyState title="No workers found" description="Try a different search." />
      )}

      {state.status === 'ready' && state.data.length > 0 && (
        <>
          <ResponsiveTable columns={columns} rows={state.data} />
          <Pager page={page} pageSize={state.pageSize} total={state.total} onPageChange={setPage} />
        </>
      )}

      <BlockConfirmModal
        open={Boolean(target)}
        account={target?.account}
        isBlocking={target?.blocking}
        submitting={submitting}
        onClose={() => setTarget(null)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
