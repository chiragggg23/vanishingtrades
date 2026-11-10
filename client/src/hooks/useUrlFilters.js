import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * All filter state lives in the URL. keys: list of param names to read.
 * update(patch): sets/clears params; resets page unless page is in the patch.
 */
export function useUrlFilters(keys) {
  const [params, setParams] = useSearchParams();
  const values = useMemo(
    () => Object.fromEntries(keys.map((k) => [k, params.get(k) || ''])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params, keys.join(',')],
  );
  const update = useCallback(
    (patch) => {
      const next = new URLSearchParams(params);
      Object.entries(patch).forEach(([k, v]) => {
        if (v === '' || v === null || v === undefined) next.delete(k);
        else next.set(k, String(v));
      });
      if (!('page' in patch)) next.delete('page');
      setParams(next);
    },
    [params, setParams],
  );
  const clear = useCallback(() => setParams(new URLSearchParams()), [setParams]);
  return { values, update, clear, params };
}
