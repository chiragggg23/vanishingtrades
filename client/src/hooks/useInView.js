import { useEffect, useRef, useState } from 'react';

/** True once (or while, with once=false) the element crosses the reading line. */
export function useInView({ rootMargin = '0px 0px -35% 0px', once = true, threshold = 0 } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) setInView(false);
      },
      { rootMargin, threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, once, threshold]);
  return [ref, inView];
}
