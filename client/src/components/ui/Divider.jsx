import s from './Divider.module.css';

const PATHS = {
  stitch: 'M2 10 C 60 4, 120 16, 180 9 S 300 4, 360 11 S 480 15, 598 8',
  wave: 'M2 12 Q 40 2 80 11 T 160 10 T 240 12 T 320 9 T 400 12 T 480 10 T 598 11',
  rule: 'M2 9 C 200 11, 400 8, 598 11',
};

/** Hand-drawn SVG divider. variant: stitch | wave | rule. */
export default function Divider({ variant = 'stitch', colour = 'currentColor', className = '' }) {
  return (
    <svg
      className={`${s.divider} ${className}`}
      viewBox="0 0 600 20"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={PATHS[variant]}
        stroke={colour}
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={variant === 'stitch' ? '10 7' : undefined}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** A hand-drawn underline that sits under a heading. */
export function HandUnderline({ colour = 'var(--madder)', className = '' }) {
  return (
    <svg
      className={`${s.underline} ${className}`}
      viewBox="0 0 300 16"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M4 10 C 70 3, 150 14, 220 6 S 280 8, 296 5"
        stroke={colour}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
