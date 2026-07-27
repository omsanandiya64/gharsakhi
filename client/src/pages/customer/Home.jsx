import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet as WalletIcon } from 'lucide-react';
import { listServices } from '../../api/services.js';
import { getCustomerWallet } from '../../api/wallet.js';
import { listCustomerBookings } from '../../api/bookings.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { Card } from '../../components/Card.jsx';
import { MoneyText } from '../../components/MoneyText.jsx';
import { ServiceIcon } from '../../components/ServiceIcon.jsx';
import { StatusPill } from '../../components/StatusPill.jsx';
import { Skeleton } from '../../components/Skeleton.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';

export default function Home() {
  const { user } = useAuth();
  const [state, setState] = useState({ status: 'loading', services: [], balancePaise: null, activeBooking: null });

  const load = useCallback(() => {
    setState({ status: 'loading', services: [], balancePaise: null, activeBooking: null });
    Promise.all([listServices(), getCustomerWallet({ page_size: 1 })])
      .then(([services, wallet]) => {
        setState({ status: 'ready', services, balancePaise: wallet.balance_paise, activeBooking: null });
        listCustomerBookings({ page_size: 5 })
          .then((res) => {
            const active = res.data.find((b) => b.status === 'pending' || b.status === 'accepted');
            setState((s) => ({ ...s, activeBooking: active ?? null }));
          })
          .catch(() => {});
      })
      .catch(() => setState((s) => ({ ...s, status: 'error' })));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === 'loading') {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-2xl" />
        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return <ErrorState message="Couldn't load your home screen." onRetry={load} />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-display font-bold text-gs-teal-900">Hello, {user?.name?.split(' ')[0] ?? 'there'}</h1>

      {state.activeBooking && (
        <Link to="/customer/bookings" className="block">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-gs-marigold bg-gs-marigold-100 p-4">
            <div className="min-w-0">
              <p className="text-sm text-gs-muted">Active booking</p>
              <p className="font-semibold text-gs-ink truncate">{state.activeBooking.service_name}</p>
            </div>
            <StatusPill status={state.activeBooking.status} />
          </div>
        </Link>
      )}

      <Card className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gs-muted flex items-center gap-1">
            <WalletIcon size={16} aria-hidden="true" />
            Wallet balance
          </p>
          <MoneyText paise={state.balancePaise} className="text-2xl font-bold text-gs-teal-900" />
        </div>
        <Link to="/customer/wallet" className="text-sm font-semibold text-gs-teal-600 min-h-[48px] flex items-center px-2">
          Top up
        </Link>
      </Card>

      <div>
        <h2 className="text-lg font-display font-semibold text-gs-teal-900 mb-3">What do you need done?</h2>
        {state.services.length === 0 ? (
          <ErrorState message="No services are available right now." onRetry={load} />
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
            {state.services.map((service) => (
              <Link key={service.id} to={`/customer/book/${service.id}`} state={{ service }}>
                <ServiceIcon icon={service.icon} name={service.name} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
