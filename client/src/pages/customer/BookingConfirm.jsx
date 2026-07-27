import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Navigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getCustomerWallet } from '../../api/wallet.js';
import { createBooking } from '../../api/bookings.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Card } from '../../components/Card.jsx';
import { MoneyText } from '../../components/MoneyText.jsx';
import { Rating } from '../../components/Rating.jsx';
import { Button } from '../../components/Button.jsx';
import { Skeleton } from '../../components/Skeleton.jsx';

export default function BookingConfirm() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { service, worker, areaId, areaName } = location.state ?? {};

  const [address, setAddress] = useState(user?.address_text ?? '');
  const [walletState, setWalletState] = useState({ status: 'loading', balancePaise: null });
  const [submit, setSubmit] = useState({ status: 'idle', message: null, insufficientBalance: false, workerOffline: false });

  useEffect(() => {
    if (!service || !worker) return;
    getCustomerWallet({ page_size: 1 })
      .then((wallet) => setWalletState({ status: 'ready', balancePaise: wallet.balance_paise }))
      .catch(() => setWalletState({ status: 'error', balancePaise: null }));
  }, [service, worker]);

  if (!service || !worker) {
    return <Navigate to="/customer" replace />;
  }

  async function handleConfirm() {
    setSubmit({ status: 'loading', message: null, insufficientBalance: false, workerOffline: false });
    try {
      await createBooking({
        service_id: service.id,
        worker_id: worker.id,
        area_id: areaId,
        address_text: address,
      });
      showToast('Booking confirmed! Waiting for the worker to accept.', 'success');
      navigate('/customer/bookings');
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'INSUFFICIENT_BALANCE') {
        setSubmit({ status: 'idle', message: null, insufficientBalance: true, workerOffline: false });
      } else if (code === 'WORKER_UNAVAILABLE') {
        setSubmit({ status: 'idle', message: null, insufficientBalance: false, workerOffline: true });
      } else {
        setSubmit({
          status: 'idle',
          message: err.response?.data?.error?.message || 'Something went wrong. Please try again.',
          insufficientBalance: false,
          workerOffline: false,
        });
      }
    }
  }

  const after = walletState.balancePaise != null ? walletState.balancePaise - service.price_paise : null;

  return (
    <div className="min-h-screen bg-gs-sand flex flex-col">
      <header className="sticky top-0 z-20 bg-white border-b border-gs-teal-100 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full hover:bg-gs-teal-100 text-gs-teal-900"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <h1 className="text-lg font-display font-bold text-gs-teal-900">Confirm your booking</h1>
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6 pb-32 space-y-6">
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gs-muted">Service</span>
            <span className="font-semibold text-gs-ink">{service.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gs-muted">Worker</span>
            <span className="font-semibold text-gs-ink flex items-center gap-2">
              {worker.name} <Rating value={Number(worker.rating_avg)} size={12} />
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gs-muted">Area</span>
            <span className="font-semibold text-gs-ink">{areaName}</span>
          </div>
          <div className="flex items-center justify-between border-t border-gs-teal-100 pt-3">
            <span className="text-sm text-gs-muted">Price</span>
            <MoneyText paise={service.price_paise} className="text-lg font-bold text-gs-teal-900" />
          </div>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-gs-ink mb-2">Wallet</p>
          {walletState.status === 'loading' && <Skeleton className="h-10 w-full" />}
          {walletState.status === 'error' && <p className="text-sm text-gs-danger">Couldn't load your balance.</p>}
          {walletState.status === 'ready' && (
            <div className="flex items-center justify-between text-sm flex-wrap gap-2">
              <span>
                Before: <MoneyText paise={walletState.balancePaise} className="font-semibold" />
              </span>
              <span aria-hidden="true">&rarr;</span>
              <span>
                After:{' '}
                <MoneyText paise={after} className={`font-semibold ${after < 0 ? 'text-gs-danger' : 'text-gs-online'}`} />
              </span>
            </div>
          )}
        </Card>

        <div>
          <label htmlFor="address" className="block text-sm font-semibold text-gs-ink mb-1">
            Address
          </label>
          <textarea
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            required
            className="w-full px-4 py-3 rounded-xl border border-gs-teal-100 focus:border-gs-teal-600 outline-none text-base"
          />
        </div>

        {submit.insufficientBalance && (
          <div className="bg-gs-danger/10 rounded-xl p-4 text-sm">
            <p className="font-semibold text-gs-danger mb-1">Not enough balance</p>
            <p className="text-gs-ink mb-2">Your wallet doesn't have enough to cover this booking.</p>
            <Link to="/customer/wallet" className="font-semibold text-gs-teal-600 underline">
              Top up your wallet
            </Link>
          </div>
        )}

        {submit.workerOffline && (
          <div className="bg-gs-marigold-100 rounded-xl p-4 text-sm">
            <p className="font-semibold text-gs-ink mb-1">They just went offline</p>
            <p className="text-gs-ink mb-3">Here's who else is available.</p>
            <Button
              variant="secondary"
              onClick={() => navigate(`/customer/book/${service.id}`, { state: { service, areaId } })}
            >
              See who else is available
            </Button>
          </div>
        )}

        {submit.message && (
          <p className="text-sm text-gs-danger" role="alert">
            {submit.message}
          </p>
        )}
      </main>

      <div className="fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gs-teal-100 p-4">
        <div className="max-w-lg mx-auto">
          <Button
            variant="primary"
            fullWidth
            disabled={submit.status === 'loading' || !address.trim()}
            onClick={handleConfirm}
          >
            {submit.status === 'loading' ? 'Confirming...' : 'Confirm booking'}
          </Button>
        </div>
      </div>
    </div>
  );
}
