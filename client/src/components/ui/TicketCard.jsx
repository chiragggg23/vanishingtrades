import { useLayoutEffect, useRef } from 'react';
import { tiltFor } from '../../lib/prng.js';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js';
import s from './TicketCard.module.css';

const finePointer = () =>
  typeof window !== 'undefined' && Boolean(window.matchMedia?.('(pointer: fine)').matches);

/**
 * Ticket with perforated notches. The wrapper carries the rotation and a hard drop-shadow filter,
 * so the shadow follows the notched shape of the inner element. Gentle 3D tilt on fine pointers only.
 */
export default function TicketCard({
  seed = '',
  as: Tag = 'article',
  tape = true,
  tone = 'paper',
  className = '',
  stub,
  children,
  ...rest
}) {
  const ref = useRef(null);
  const stubRef = useRef(null);
  // The notches sit exactly on the line above the stub, wherever the content puts it.
  useLayoutEffect(() => {
    const el = stubRef.current;
    const host = ref.current;
    if (!el || !host) return undefined;
    const set = () => {
      const pad = parseFloat(getComputedStyle(el.parentElement).paddingBottom) || 0;
      host.style.setProperty('--stub', `${el.offsetHeight + pad}px`);
    };
    set();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(set) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  const reduced = usePrefersReducedMotion();
  const rot = tiltFor(seed, 1.6);
  const tilt = !reduced && finePointer();
  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--rx', `${(-y * 5).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${(x * 6).toFixed(2)}deg`);
  };
  const onLeave = () => {
    ref.current?.style.setProperty('--rx', '0deg');
    ref.current?.style.setProperty('--ry', '0deg');
  };
  return (
    <Tag
      ref={ref}
      className={`${s.wrap} ${className}`}
      style={{ '--rot': `${rot}deg` }}
      onPointerMove={tilt ? onMove : undefined}
      onPointerLeave={tilt ? onLeave : undefined}
      {...rest}
    >
      {tape && (
        <span
          className={s.tape}
          aria-hidden="true"
          style={{ '--tape-rot': `${(-rot * 2 - 3).toFixed(1)}deg` }}
        />
      )}
      <div className={`${s.ticket} ${s[tone] || ''}`}>
        {children}
        {stub && (
          <div ref={stubRef} className={s.stub}>
            {stub}
          </div>
        )}
      </div>
    </Tag>
  );
}
