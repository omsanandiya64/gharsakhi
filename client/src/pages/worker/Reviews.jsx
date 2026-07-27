import { useCallback, useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { getWorkerReviews } from '../../api/bookings.js';
import { Card } from '../../components/Card.jsx';
import { Rating } from '../../components/Rating.jsx';
import { Pager } from '../../components/Pager.jsx';
import { SkeletonList, Skeleton } from '../../components/Skeleton.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';
import { formatDate } from '../../lib/format.js';

function BreakdownBar({ stars, count, maxCount }) {
  const widthPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="flex items-center gap-1 w-10 shrink-0 text-gs-muted">
        {stars} <Star size={12} className="fill-gs-marigold text-gs-marigold" aria-hidden="true" />
      </span>
      <div className="flex-1 h-2 rounded-full bg-gs-teal-100 overflow-hidden">
        <div className="h-full bg-gs-marigold" style={{ width: `${widthPct}%` }} />
      </div>
      <span className="w-6 text-right text-gs-muted shrink-0">{count}</span>
    </div>
  );
}

export default function Reviews() {
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ status: 'loading', breakdown: null, data: [], total: 0, pageSize: 20 });

  const load = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }));
    getWorkerReviews({ page })
      .then((res) =>
        setState({
          status: 'ready',
          breakdown: res.breakdown,
          data: res.reviews.data,
          total: res.reviews.total,
          pageSize: res.reviews.page_size,
        })
      )
      .catch(() => setState((s) => ({ ...s, status: 'error' })));
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === 'loading') {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <SkeletonList rows={3} rowClassName="h-20" />
      </div>
    );
  }

  if (state.status === 'error') {
    return <ErrorState message="Couldn't load your reviews." onRetry={load} />;
  }

  const maxCount = Math.max(1, ...Object.values(state.breakdown));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-display font-bold text-gs-teal-900">My Reviews</h1>

      <Card className="space-y-2">
        {[5, 4, 3, 2, 1].map((stars) => (
          <BreakdownBar key={stars} stars={stars} count={state.breakdown[stars] ?? 0} maxCount={maxCount} />
        ))}
      </Card>

      {state.data.length === 0 ? (
        <EmptyState title="No reviews yet" description="Reviews from customers will show up here." />
      ) : (
        <div className="space-y-3">
          {state.data.map((review) => (
            <Card key={review.id}>
              <div className="flex items-center justify-between gap-3 mb-1">
                <p className="font-semibold text-gs-ink">{review.customer_name}</p>
                <Rating value={review.rating} size={14} />
              </div>
              <p className="text-xs text-gs-muted mb-2">{formatDate(review.created_at)}</p>
              {review.comment && <p className="text-sm text-gs-ink">{review.comment}</p>}
            </Card>
          ))}
          <Pager page={page} pageSize={state.pageSize} total={state.total} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
