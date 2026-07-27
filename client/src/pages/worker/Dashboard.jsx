import { useCallback, useEffect, useRef, useState } from 'react';
import { getWorkerMe, setWorkerAvailability } from '../../api/worker.js';
import { getWorkerRequests, acceptBooking, declineBooking } from '../../api/bookings.js';
import { useToast } from '../../components/Toast.jsx';
import { usePolling } from '../../lib/usePolling.js';
import { subscribeToPush } from '../../lib/push.js';
import { Card } from '../../components/Card.jsx';
import { MoneyText } from '../../components/MoneyText.jsx';
import { Rating } from '../../components/Rating.jsx';
import { Skeleton, SkeletonList } from '../../components/Skeleton.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';
import { JobRequestCard } from './JobRequestCard.jsx';
import { DeclineModal } from './DeclineModal.jsx';

export default function Dashboard() {
  const { showToast } = useToast();
  const [meState, setMeState] = useState({ status: 'loading', me: null });
  const [isOnline, setIsOnline] = useState(null);
  const [requestsState, setRequestsState] = useState({ status: 'loading', requests: [] });
  const [busyId, setBusyId] = useState(null);
  const [declineTarget, setDeclineTarget] = useState(null);
  const [declining, setDeclining] = useState(false);
  const requestsFailCountRef = useRef(0);

  const loadMe = useCallback(() => {
    setMeState({ status: 'loading', me: null });
    getWorkerMe()
      .then((me) => {
        setMeState({ status: 'ready', me });
        setIsOnline(me.is_online);
      })
      .catch(() => setMeState({ status: 'error', me: null }));
  }, []);

  const loadRequests = useCallback(() => {
    setRequestsState((s) => ({ ...s, status: 'loading' }));
    getWorkerRequests()
      .then((requests) => {
        requestsFailCountRef.current = 0;
        setRequestsState({ status: 'ready', requests });
      })
      .catch(() => setRequestsState({ status: 'error', requests: [] }));
  }, []);

  // Polling (§8): every 5s, skipping ticks while the tab is hidden and never
  // overlapping (handled by usePolling itself). A single failed poll must not
  // wipe out a perfectly good list on screen - only after 3 consecutive
  // failures does it fall back to the error state.
  const pollRequests = useCallback(async (isMounted) => {
    try {
      const requests = await getWorkerRequests();
      if (!isMounted()) return;
      requestsFailCountRef.current = 0;
      setRequestsState({ status: 'ready', requests });
    } catch {
      if (!isMounted()) return;
      requestsFailCountRef.current += 1;
      setRequestsState((s) => (s.status === 'ready' && requestsFailCountRef.current < 3 ? s : { status: 'error', requests: [] }));
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  usePolling(pollRequests, 5000);

  async function handleToggle() {
    const next = !isOnline;
    setIsOnline(next);
    try {
      await setWorkerAvailability(next);
      if (next) subscribeToPush().catch(() => {});
    } catch (err) {
      setIsOnline(!next);
      showToast(err.response?.data?.error?.message || 'Could not update your availability.', 'error');
    }
  }

  async function handleAccept(request) {
    setBusyId(request.id);
    try {
      await acceptBooking(request.id);
      showToast('Job accepted!', 'success');
      loadRequests();
    } catch (err) {
      const code = err.response?.data?.error?.code;
      showToast(err.response?.data?.error?.message || 'Could not accept this job.', 'error');
      if (code === 'INVALID_TRANSITION' || code === 'NOT_FOUND') loadRequests();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeclineConfirm(reason) {
    setDeclining(true);
    try {
      await declineBooking(declineTarget.id, reason);
      showToast('Job declined.', 'success');
      setDeclineTarget(null);
      loadRequests();
    } catch (err) {
      const code = err.response?.data?.error?.code;
      showToast(err.response?.data?.error?.message || 'Could not decline this job.', 'error');
      if (code === 'INVALID_TRANSITION' || code === 'NOT_FOUND') {
        setDeclineTarget(null);
        loadRequests();
      }
    } finally {
      setDeclining(false);
    }
  }

  if (meState.status === 'loading') {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (meState.status === 'error' || !meState.me) {
    return <ErrorState message="Couldn't load your dashboard." onRetry={loadMe} />;
  }

  const me = meState.me;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={handleToggle}
        role="switch"
        aria-checked={isOnline}
        aria-label={isOnline ? 'Go offline' : 'Go online'}
        className={`w-full flex items-center justify-between gap-4 rounded-2xl p-5 min-h-[64px] transition-colors ${
          isOnline ? 'bg-gs-online text-white' : 'bg-white border-2 border-gs-teal-100 text-gs-ink'
        }`}
      >
        <span className="flex items-center gap-3">
          <span
            className={`w-3 h-3 rounded-full ${isOnline ? 'bg-white motion-safe:animate-pulse' : 'bg-gs-muted'}`}
            aria-hidden="true"
          />
          <span className="text-lg font-display font-bold">{isOnline ? "You're online" : "You're offline"}</span>
        </span>
        <span
          className={`relative inline-flex items-center w-14 h-8 rounded-full transition-colors shrink-0 ${
            isOnline ? 'bg-white/30' : 'bg-gs-teal-100'
          }`}
        >
          <span
            className={`absolute w-6 h-6 rounded-full bg-white shadow transition-transform ${
              isOnline ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </span>
      </button>
      <p className="text-sm text-gs-muted -mt-3">
        Going offline stops new job requests - jobs you've already accepted continue as normal.
      </p>

      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center py-4">
          <p className="text-xs text-gs-muted">Today</p>
          <MoneyText paise={me.today_earning_paise} className="block text-lg font-bold text-gs-teal-900 mt-1" />
        </Card>
        <Card className="text-center py-4">
          <p className="text-xs text-gs-muted">Wallet</p>
          <MoneyText paise={me.wallet_paise} className="block text-lg font-bold text-gs-teal-900 mt-1" />
        </Card>
        <Card className="text-center py-4">
          <p className="text-xs text-gs-muted">Rating</p>
          <div className="flex justify-center mt-1.5">
            <Rating value={Number(me.rating_avg)} count={me.rating_count} size={13} />
          </div>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-display font-semibold text-gs-teal-900 mb-3">Incoming requests</h2>

        {requestsState.status === 'loading' && <SkeletonList rows={2} rowClassName="h-40" />}

        {requestsState.status === 'error' && <ErrorState message="Couldn't load requests." onRetry={loadRequests} />}

        {requestsState.status === 'ready' && requestsState.requests.length === 0 && (
          <EmptyState
            title="No requests right now"
            description={isOnline ? "You'll see new job requests here as they come in." : 'Go online to start receiving job requests.'}
          />
        )}

        {requestsState.status === 'ready' && requestsState.requests.length > 0 && (
          <div className="space-y-3">
            {requestsState.requests.map((request) => (
              <JobRequestCard
                key={request.id}
                request={request}
                busy={busyId === request.id}
                onAccept={() => handleAccept(request)}
                onDecline={() => setDeclineTarget(request)}
              />
            ))}
          </div>
        )}
      </div>

      <DeclineModal
        open={Boolean(declineTarget)}
        submitting={declining}
        onClose={() => setDeclineTarget(null)}
        onConfirm={handleDeclineConfirm}
      />
    </div>
  );
}
