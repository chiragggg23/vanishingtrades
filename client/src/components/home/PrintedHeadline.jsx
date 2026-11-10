import s from './PrintedHeadline.module.css';

/**
 * Headline whose words "print" one after another. The ink key drops into place (transform only,
 * never transparent, so it counts for LCP straight away) while a madder plate, drawn by a CSS
 * aria-hidden span, lands off-register and slides into near-register.
 */
export default function PrintedHeadline({ text, play = true, className = '' }) {
  const words = String(text).split(/\s+/).filter(Boolean);
  return (
    <h1 className={`${s.h} ${play ? s.play : s.waiting} ${className}`}>
      {words.map((w, i) => (
        <span key={`${w}${i}`} className={s.word} style={{ '--i': i }}>
          <span className={s.plate} aria-hidden="true">
            {w}
          </span>
          <span className={s.key}>{w}</span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </h1>
  );
}
