import s from './PrintedHeadline.module.css';

/**
 * Headline whose words "print" one after another. Each word has a key plate (ink) and a madder
 * plate (aria-hidden) that lands off-register and slides into near-register. Only transform and
 * opacity animate.
 */
export default function PrintedHeadline({ text, play = true, className = '' }) {
  const words = String(text).split(/\s+/).filter(Boolean);
  return (
    <h1 className={`${s.h} ${play ? s.play : ''} ${className}`}>
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
