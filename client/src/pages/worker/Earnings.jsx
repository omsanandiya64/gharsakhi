import { useCallback, useEffect, useState } from 'react';
import { getWorkerWallet } from '../../api/wallet.js';
import { Card } from '../../components/Card.jsx';
import { MoneyText } from '../../components/MoneyText.jsx';
import { Pager } from '../../components/Pager.jsx';
import { SkeletonList, Skeleton } from '../../components/Skeleton.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';
import { formatDateTime } from '../../lib/format.js';

const TYPE_LABELS = {
  earning: 'Earning',
};

export default function Earnings() {
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ status: 'loading', balancePaise: null, data: [], total: 0, pageSize: 20 });

  const load = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }));
    getWorkerWallet({ page })
      .then((res) =>
        setState({
          status: 'ready',
          balancePaise: res.balance_paise,
          data: res.transactions.data,
          total: res.transactions.total,
          pageSize: res.transactions.page_size,
        })
      )
      .catch(() => setState((s) => ({ ...s, status: 'error' })));
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-display font-bold text-gs-teal-900">Earnings</h1>

      <Card>
        <p className="text-sm text-gs-muted">Wallet balance</p>
        {state.status === 'loading' ? (
          <Skeleton className="h-8 w-32 mt-1" />
        ) : (
          <MoneyText paise={state.balancePaise ?? 0} className="text-2xl font-bold text-gs-teal-900" />
        )}
      </Card>

      <div>
        <h2 className="text-lg font-display font-semibold text-gs-teal-900 mb-3">Transactions</h2>

        {state.status === 'loading' && <SkeletonList rows={5} rowClassName="h-16" />}

        {state.status === 'error' && <ErrorState message="Couldn't load your earnings." onRetry={load} />}

        {state.status === 'ready' && state.data.length === 0 && (
          <EmptyState title="No earnings yet" description="Completed jobs will show up here." />
        )}

        {state.status === 'ready' && state.data.length > 0 && (
          <div className="space-y-2">
            {state.data.map((txn) => (
              <Card key={txn.id} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-gs-ink">{TYPE_LABELS[txn.type] ?? txn.type}</p>
                  <p className="text-sm text-gs-muted truncate">
                    {txn.service_name ?? txn.note ?? formatDateTime(txn.created_at)}
                  </p>
                </div>
                <MoneyText paise={txn.amount_paise} className="font-semibold text-gs-online shrink-0" />
              </Card>
            ))}
            <Pager page={page} pageSize={state.pageSize} total={state.total} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
