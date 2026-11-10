import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { prefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js';
import s from './LoomIntro.module.css';

const KEY = 'vt-intro-seen';
const COLOURS = ['#B8402E', '#25407A', '#E0A526', '#4F6B3A', '#1E1B18'];

export function shouldPlayIntro() {
  if (prefersReducedMotion()) return false;
  try {
    return sessionStorage.getItem(KEY) !== '1';
  } catch {
    return false;
  }
}

/**
 * First visit of a session: coloured threads weave across and settle into the title.
 * At most 2.4 s, skippable, never shown under prefers-reduced-motion.
 */
export default function LoomIntro({ onDone }) {
  const { t } = useTranslation();
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    const a = setTimeout(() => setLeaving(true), 1950);
    const b = setTimeout(onDone, 2400);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [onDone]);
  return (
    <div className={`${s.intro} ${leaving ? s.leaving : ''}`}>
      <svg className={s.threads} viewBox="0 0 400 240" preserveAspectRatio="none" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => (
          <rect
            key={`w${i}`}
            className={s.weft}
            x="-400"
            y={20 + i * 14}
            width="400"
            height="6"
            fill={COLOURS[i % COLOURS.length]}
            style={{ animationDelay: `${i * 55}ms` }}
          />
        ))}
        {Array.from({ length: 18 }, (_, i) => (
          <rect
            key={`v${i}`}
            className={s.warp}
            x={14 + i * 22}
            y="0"
            width="2"
            height="240"
            fill="#1E1B18"
            style={{ animationDelay: `${300 + i * 30}ms` }}
          />
        ))}
      </svg>
      <p className={s.title} aria-hidden="true">
        Vanishing<em>Trades</em>
      </p>
      <button type="button" className={s.skip} onClick={onDone}>
        {t('intro.skip')}
      </button>
    </div>
  );
}
