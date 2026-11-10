import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import s from './SdgStamp.module.css';

const COLOURS = { 4: '#C5192D', 8: '#A21942', 11: '#FD9D24' };
const TEXT = { 4: '#F3EAD8', 8: '#F3EAD8', 11: '#1E1B18' };

/**
 * Round, rough-edged SDG badge in the official goal colour. Text only, no official logos.
 * The displacement filter roughens the disc only; the lettering stays crisp.
 */
export default function SdgStamp({
  goal = 8,
  size = 112,
  rotate = -4,
  animated = false,
  caption = true,
  className = '',
}) {
  const { t } = useTranslation();
  const id = useId().replace(/:/g, '');
  return (
    <span
      className={`${s.wrap} ${animated ? s.animated : ''} ${className}`}
      style={{ '--size': `${size}px`, '--rot': `${rotate}deg` }}
      role="img"
      aria-label={t('sdg.stampLabel', { goal: goal === 11 ? '11.4' : goal, name: t(`sdg.g${goal}.name`) })}
    >
      <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false" className={s.disc}>
        <defs>
          <filter id={`rough${id}`} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={goal} />
            <feDisplacementMap in="SourceGraphic" scale="5" />
          </filter>
          <path id={`arc${id}`} d="M60 60 m-41 0 a41 41 0 1 1 82 0 a41 41 0 1 1 -82 0" />
        </defs>
        <g filter={`url(#rough${id})`}>
          <circle cx="60" cy="60" r="56" fill={COLOURS[goal]} />
          <circle
            cx="60"
            cy="60"
            r="49"
            fill="none"
            stroke={TEXT[goal]}
            strokeWidth="1.6"
            strokeDasharray="3 2.5"
            opacity="0.75"
          />
        </g>
        <g className={s.ring}>
          <text fontSize="8.4" fontWeight="700" letterSpacing="1.6" fill={TEXT[goal]}>
            <textPath href={`#arc${id}`}>GLOBAL GOAL · GLOBAL GOAL · GLOBAL GOAL ·</textPath>
          </text>
        </g>
        <text
          x="60"
          y="56"
          textAnchor="middle"
          fontSize="12"
          fontWeight="700"
          fill={TEXT[goal]}
          letterSpacing="1.5"
        >
          SDG
        </text>
        <text
          x="60"
          y="82"
          textAnchor="middle"
          fontSize={goal === 11 ? 23 : 30}
          fontWeight="800"
          fill={TEXT[goal]}
          fontFamily="Fraunces, Georgia, serif"
        >
          {goal === 11 ? '11.4' : goal}
        </text>
      </svg>
      {caption && (
        <span className={s.caption} aria-hidden="true">
          {t(`sdg.g${goal}.short`)}
        </span>
      )}
    </span>
  );
}
