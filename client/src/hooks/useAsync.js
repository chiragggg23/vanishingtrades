import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Run an async loader and track { data, error, loading }. Re-runs when deps change.
 * reload() runs it again; setData() lets callers update after a mutation.
 */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const run = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(loader, deps);

  const reload = useCallback(async () => {
    const id = ++run.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await load();
      if (id === run.current) setState({ data, error: null, loading: false });
    } catch (error) {
      if (id === run.current) setState({ data: null, error, loading: false });
    }
  }, [load]);

  useEffect(() => {
    reload();
  }, [reload]);

  const setData = useCallback(
    (updater) =>
      setState((s) => ({
        ...s,
        data: typeof updater === 'function' ? updater(s.data) : updater,
      })),
    [],
  );
  return { ...state, reload, setData };
}
