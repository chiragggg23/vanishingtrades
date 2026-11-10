// Reusable workshop illustrations as inline SVG. Motion is CSS-only (transform), and stops under
// prefers-reduced-motion. All are decorative (aria-hidden) unless given a title.
import s from './Illustrations.module.css';

const INK = '#1E1B18';
const a11y = (title) =>
  title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': 'true', focusable: 'false' };

/** Potter's wheel seen at an angle: the disc turns inside a flattened group, so it spins elliptically. */
export function PottersWheel({ title, className = '', still = false }) {
  return (
    <svg
      viewBox="0 0 240 200"
      className={`${s.svg} ${className}`}
      data-still={still}
      {...a11y(title)}
    >
      <ellipse cx="120" cy="182" rx="92" ry="10" className={s.halftoneShadow} />
      <path
        d="M96 128 L84 180 M144 128 L156 180"
        stroke={INK}
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* the turning disc: outer group flattens, inner group rotates */}
      <g transform="translate(120 126) scale(1 0.32)">
        <circle r="86" fill="#B8402E" stroke={INK} strokeWidth="6" />
        <g className={s.spin}>
          {Array.from({ length: 12 }, (_, i) => (
            <path
              key={i}
              d="M0 0 L0 -80"
              stroke="#E0A526"
              strokeWidth="7"
              transform={`rotate(${i * 30})`}
              strokeDasharray={i % 3 === 0 ? '0' : '10 8'}
            />
          ))}
          <circle r="24" fill="#8E3324" />
        </g>
      </g>
      <path d="M34 126 v8 q86 36 172 0 v-8" fill="#8E3324" stroke={INK} strokeWidth="4" />
      {/* the pot rising on the wheel */}
      <g className={s.bob}>
        <path
          d="M96 120 Q88 96 102 78 Q96 66 104 58 L136 58 Q144 66 138 78 Q152 96 144 120 Z"
          fill="#C96A4A"
          stroke={INK}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path d="M104 92 q16 8 32 0" stroke="#E0A526" strokeWidth="4" fill="none" />
        <path
          d="M108 102 q12 6 24 0"
          stroke={INK}
          strokeWidth="2"
          fill="none"
          strokeDasharray="3 4"
        />
      </g>
    </svg>
  );
}

/** Loom with sliding shuttle and swaying weft. empty: the vanished-loom variant for 404. */
export function Loom({ title, className = '', empty = false, still = false }) {
  const warp = Array.from({ length: 13 }, (_, i) => 52 + i * 11);
  const colours = ['#B8402E', '#25407A', '#E0A526', '#4F6B3A'];
  return (
    <svg
      viewBox="0 0 260 220"
      className={`${s.svg} ${className}`}
      data-still={still}
      {...a11y(title)}
    >
      <ellipse cx="130" cy="206" rx="110" ry="8" className={s.halftoneShadow} />
      {/* frame */}
      <g stroke={INK} strokeWidth="7" strokeLinecap="round" fill="none">
        <path d="M34 200 V24 M226 200 V24" />
        <path d="M24 30 H236" />
        <path d="M40 176 H220" strokeWidth="5" />
      </g>
      {!empty &&
        warp.map((x) => (
          <path key={x} d={`M${x} 34 V172`} stroke={INK} strokeWidth="1.6" opacity="0.8" />
        ))}
      {!empty &&
        [0, 1, 2, 3, 4, 5, 6].map((r) => (
          <rect
            key={r}
            x="48"
            y={150 - r * 9}
            width="164"
            height="7"
            fill={colours[r % 4]}
            opacity="0.95"
          />
        ))}
      {!empty && (
        <>
          <path
            className={s.sway}
            d="M48 82 C 90 92, 150 70, 212 84"
            stroke="#B8402E"
            strokeWidth="3"
            fill="none"
          />
          <g className={s.shuttle}>
            <path
              d="M70 92 q30 -12 60 0 q-30 12 -60 0z"
              fill="#E0A526"
              stroke={INK}
              strokeWidth="3"
            />
            <path d="M84 92 h32" stroke={INK} strokeWidth="2" />
          </g>
        </>
      )}
      {empty &&
        [70, 112, 160, 196].map((x, i) => (
          <path
            key={x}
            className={s.sway}
            style={{ animationDelay: `${i * -0.7}s` }}
            d={`M${x} 34 q${i % 2 ? 6 : -6} 30 0 ${50 + i * 12}`}
            stroke={colours[i]}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        ))}
    </svg>
  );
}

/** Chisel taking a curl off a block of wood. */
export function Chisel({ title, className = '', still = false }) {
  return (
    <svg
      viewBox="0 0 240 180"
      className={`${s.svg} ${className}`}
      data-still={still}
      {...a11y(title)}
    >
      <ellipse cx="120" cy="166" rx="96" ry="8" className={s.halftoneShadow} />
      <path d="M30 120 L170 120 L196 160 L56 160 Z" fill="#8E5A3C" stroke={INK} strokeWidth="4" />
      <path
        d="M44 132 q40 -6 80 2 M60 146 q50 -8 110 2"
        stroke={INK}
        strokeWidth="1.6"
        fill="none"
        opacity="0.6"
      />
      <g className={s.carve}>
        <path d="M150 30 L196 14 L204 34 L162 52 Z" fill="#B8402E" stroke={INK} strokeWidth="4" />
        <path
          d="M162 52 L120 100 L112 96 L150 40"
          fill="#C9C1B3"
          stroke={INK}
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </g>
      <g className={s.curl}>
        <path
          d="M110 112 c-18 -4 -26 -22 -14 -30 c10 -6 22 4 14 12 c-5 4 -10 -1 -7 -4"
          stroke="#E0A526"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

/** Spinning wheel (charkha). */
export function SpinningWheel({ title, className = '', still = false }) {
  return (
    <svg
      viewBox="0 0 240 200"
      className={`${s.svg} ${className}`}
      data-still={still}
      {...a11y(title)}
    >
      <ellipse cx="120" cy="188" rx="96" ry="8" className={s.halftoneShadow} />
      <path d="M30 180 H210" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M86 180 L86 100 M86 100 L60 180" stroke={INK} strokeWidth="5" />
      <g transform="translate(86 96)">
        <g className={s.spinSlow}>
          <circle r="62" fill="none" stroke="#25407A" strokeWidth="7" />
          {Array.from({ length: 8 }, (_, i) => (
            <path
              key={i}
              d="M0 0 V-60"
              stroke={INK}
              strokeWidth="3"
              transform={`rotate(${i * 45})`}
            />
          ))}
          <circle r="8" fill="#B8402E" stroke={INK} strokeWidth="3" />
        </g>
      </g>
      <path
        d="M86 34 C 140 40, 180 120, 192 150"
        stroke="#E0A526"
        strokeWidth="2"
        fill="none"
        className={s.sway}
      />
      <path d="M176 150 h32 v10 h-32z" fill="#B8402E" stroke={INK} strokeWidth="3" />
      <ellipse cx="192" cy="148" rx="7" ry="9" fill="#F3EAD8" stroke={INK} strokeWidth="2.5" />
    </svg>
  );
}

/** Small hand-press for the footer colophon. Stamps when its parent is hovered/focused. */
export function Press({ className = '' }) {
  return (
    <svg
      viewBox="0 0 120 110"
      className={`${s.svg} ${s.press} ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M14 102 H106" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M24 102 V26 H96 V102" stroke="currentColor" strokeWidth="5" fill="none" />
      <path d="M60 8 V30" stroke="currentColor" strokeWidth="5" />
      <path d="M40 8 H80" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <g className={s.platen}>
        <rect
          x="34"
          y="40"
          width="52"
          height="16"
          fill="#B8402E"
          stroke="currentColor"
          strokeWidth="3"
        />
      </g>
      <rect
        x="32"
        y="84"
        width="56"
        height="10"
        fill="#E0A526"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path className={s.print} d="M40 80 h40" stroke="#B8402E" strokeWidth="4" />
    </svg>
  );
}
