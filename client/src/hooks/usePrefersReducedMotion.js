import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';
const get = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.(QUERY).matches);

/** JS side of the reduced-motion check (CSS has its own media query). */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia?.(QUERY);
    if (!mq) return undefined;
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}
export const prefersReducedMotion = get;
