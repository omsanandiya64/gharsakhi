import { useCallback, useEffect, useState } from 'react';
import { getAdminStats } from '../../api/admin.js';
import { Card } from '../../components/Card.jsx';
import { MoneyText } from '../../components/MoneyText.jsx';
import { StatusPill } from '../../components/StatusPill.jsx';
import { Skeleton } from '../../components/Skeleton.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';

const STATUS_ORDER = ['pending', 'accepted', 'declined', 'completed', 'cancelled'];

export default function Dashboard() {
  const [state, setState] = useState({ status: 'loading', stats: null });

  const load = useCallback(() => {
    setState({ status: 'loading', stats: null });
    getAdminStats()
      .then((stats) => setState({ status: 'ready', stats }))
      .catch(() => setState({ status: 'error', stats: null }));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === 'loading') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (state.status === 'error' || !state.stats) {
    return <ErrorState message="Couldn't load dashboard stats." onRetry={load} />;
  }

  // Phase 5's stats query guarantees all five status keys are always present
  // (it cross-joins the booking_status enum itself) - no defensive `?? 0` needed.
  const s = state.stats;
  const totalBookings = STATUS_ORDER.reduce((sum, key) => sum + s.bookings_by_status[key], 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-display font-bold text-gs-teal-900">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="text-center py-5">
          <p className="text-xs text-gs-muted">Customers</p>
          <p className="text-2xl font-bold text-gs-teal-900 mt-1 font-mono">{s.total_customers}</p>
        </Card>
        <Card className="text-center py-5">
          <p className="text-xs text-gs-muted">Workers</p>
          <p className="text-2xl font-bold text-gs-teal-900 mt-1 font-mono">{s.total_workers}</p>
        </Card>
        <Card className="text-center py-5">
          <p className="text-xs text-gs-muted">Online now</p>
          <p className="text-2xl font-bold text-gs-online mt-1 font-mono">{s.online_workers}</p>
        </Card>
        <Card className="text-center py-5">
          <p className="text-xs text-gs-muted">Total bookings</p>
          <p className="text-2xl font-bold text-gs-teal-900 mt-1 font-mono">{totalBookings}</p>
        </Card>
        <Card className="text-center py-5">
          <p className="text-xs text-gs-muted">GMV</p>
          <MoneyText paise={s.gmv_paise} className="block text-2xl font-bold text-gs-teal-900 mt-1" />
          <p className="text-[11px] text-gs-muted mt-1">Completed bookings only</p>
        </Card>
        <Card className="text-center py-5">
          <p className="text-xs text-gs-muted">Commission earned</p>
          <MoneyText paise={s.commission_paise} className="block text-2xl font-bold text-gs-marigold mt-1" />
          <p className="text-[11px] text-gs-muted mt-1">Completed bookings only</p>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-display font-semibold text-gs-teal-900 mb-3">Bookings by status</h2>
        <Card>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {STATUS_ORDER.map((key) => (
              <div key={key} className="text-center">
                <StatusPill status={key} />
                <p className="text-xl font-bold text-gs-ink mt-2 font-mono">{s.bookings_by_status[key]}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
