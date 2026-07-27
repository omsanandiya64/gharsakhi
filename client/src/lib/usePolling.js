import { useEffect, useRef } from 'react';

/**
 * Calls `callback` immediately and then every `intervalMs`, skipping ticks
 * while the tab is hidden per the spec's polling rule (§8). Not wired up to
 * any screen yet - Phase 10 connects this to the `?since=` polling endpoints.
 */
export function usePolling(callback, intervalMs = 5000, enabled = true) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return undefined;

    function tick() {
      if (document.visibilityState === 'visible') {
        callbackRef.current();
      }
    }

    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
