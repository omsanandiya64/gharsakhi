import { useEffect, useRef } from 'react';

/**
 * Polls `callback` every `intervalMs`, skipping ticks while the tab is
 * hidden (§8) and firing an immediate tick when it becomes visible again
 * rather than waiting for the next scheduled interval. Never lets two polls
 * overlap - if one is still in flight when the next tick fires, that tick is
 * skipped rather than stacking. `callback` receives an `isMounted()`
 * function so the caller can guard against setting state after the
 * component using this hook has unmounted mid-request.
 */
export function usePolling(callback, intervalMs = 5000, enabled = true) {
  const callbackRef = useRef(callback);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return undefined;
    mountedRef.current = true;
    const isMounted = () => mountedRef.current;

    async function tick() {
      if (document.visibilityState !== 'visible') return;
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        await callbackRef.current(isMounted);
      } finally {
        inFlightRef.current = false;
      }
    }

    tick();
    const intervalId = setInterval(tick, intervalMs);

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') tick();
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [intervalMs, enabled]);
}
