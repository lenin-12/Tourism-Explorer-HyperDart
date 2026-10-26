import { useCallback, useEffect, useState } from 'react';

// status: idle | loading | ready | error. The only place async state is managed.
// It starts as 'loading' when enabled, so no "empty" or "error" message flashes before the first fetch.
export function useAsync(run, deps, enabled = true) {
  const [state, setState] = useState({ status: enabled ? 'loading' : 'idle', data: null, error: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const ctrl = new AbortController();
    setState({ status: 'loading', data: null, error: null });
    run(ctrl.signal)
      .then((data) => { if (!ctrl.signal.aborted) setState({ status: 'ready', data, error: null }); })
      .catch((error) => { if (!ctrl.signal.aborted && error.name !== 'AbortError') setState({ status: 'error', data: null, error }); });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, enabled]);
  return { ...state, retry: useCallback(() => setTick((t) => t + 1), []) };
}
