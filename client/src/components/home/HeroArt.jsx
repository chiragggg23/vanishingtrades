import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Loom, PottersWheel, SpinningWheel } from '../art/Illustrations.jsx';
import CraftArt from '../art/CraftArt.jsx';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js';
import s from './HeroArt.module.css';

/**
 * A torn indigo sheet with layered workshop illustrations. Layers drift at different speeds on
 * scroll and pointer (transform only, rAF-throttled); idle motion lives in the illustrations.
 */
/** paused: hold the idle motion (used while the loom intro covers the hero). */
export default function HeroArt({ paused = false }) {
  const { t } = useTranslation();
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return undefined;
    let frame = 0;
    let px = 0;
    let py = 0;
    const apply = () => {
      frame = 0;
      const y = Math.min(window.scrollY, 900);
      el.style.setProperty('--sy', `${y}px`);
      el.style.setProperty('--px', px.toFixed(3));
      el.style.setProperty('--py', py.toFixed(3));
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onPointer = (e) => {
      if (e.pointerType !== 'mouse') return;
      px = e.clientX / window.innerWidth - 0.5;
      py = e.clientY / window.innerHeight - 0.5;
      queue();
    };
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('pointermove', onPointer, { passive: true });
    apply();
    return () => {
      window.removeEventListener('scroll', queue);
      window.removeEventListener('pointermove', onPointer);
      cancelAnimationFrame(frame);
    };
  }, [reduced]);

  return (
    <div className={s.sheet} ref={ref} aria-hidden="true">
      <div className={s.paperBack} />
      <div className={`${s.layer} ${s.l1}`}>
        <SpinningWheel still={reduced || paused} />
      </div>
      <div className={`${s.layer} ${s.l2}`}>
        <Loom still={reduced || paused} />
      </div>
      <div className={`${s.layer} ${s.l3}`}>
        <PottersWheel still={reduced || paused} />
      </div>
      <div className={`${s.layer} ${s.l4}`}>
        <CraftArt craftType="channapatna" seed="hero-top" />
      </div>
      <span className={s.sticker}>{t('home.sticker')}</span>
    </div>
  );
}
