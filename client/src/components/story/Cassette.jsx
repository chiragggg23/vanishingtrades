import s from './Cassette.module.css';

/** SVG cassette. Reels spin while `spinning`; tape moves from left reel to right with progress. */
export default function Cassette({ spinning = false, progress = 0, label = '', level = 0 }) {
  const p = Math.max(0, Math.min(1, progress || 0));
  const left = 30 - p * 14;
  const right = 16 + p * 14;
  return (
    <svg
      viewBox="0 0 320 200"
      className={`${s.cassette} ${spinning ? s.spinning : ''}`}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="6" y="6" width="308" height="188" rx="14" fill="#2A2622" stroke="#1E1B18" strokeWidth="4" />
      <rect x="22" y="20" width="276" height="112" rx="6" fill="#F3EAD8" />
      <rect x="22" y="20" width="276" height="26" fill="#B8402E" />
      <text x="34" y="38" className={s.labelText}>
        {label.length > 34 ? `${label.slice(0, 33)}…` : label}
      </text>
      {[58, 66, 74].map((y) => (
        <line key={y} x1="34" y1={y} x2="286" y2={y} stroke="#25407A" strokeOpacity="0.25" />
      ))}
      <rect x="88" y="66" width="144" height="52" rx="26" fill="#3A342E" />
      {/* tape on each reel */}
      <circle cx="116" cy="92" r={left} fill="#5A3E2B" />
      <circle cx="204" cy="92" r={right} fill="#5A3E2B" />
      <g transform="translate(116 92)">
        <g className={s.reel}>
          <circle r="12" fill="#F3EAD8" stroke="#1E1B18" strokeWidth="2" />
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <rect key={a} x="-1.6" y="-11" width="3.2" height="6" fill="#1E1B18" transform={`rotate(${a})`} />
          ))}
        </g>
      </g>
      <g transform="translate(204 92)">
        <g className={s.reel}>
          <circle r="12" fill="#F3EAD8" stroke="#1E1B18" strokeWidth="2" />
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <rect key={a} x="-1.6" y="-11" width="3.2" height="6" fill="#1E1B18" transform={`rotate(${a})`} />
          ))}
        </g>
      </g>
      <path d="M70 194 L92 150 H228 L250 194" fill="#3A342E" stroke="#1E1B18" strokeWidth="3" />
      <circle cx="120" cy="172" r="5" fill="#1E1B18" />
      <circle cx="200" cy="172" r="5" fill="#1E1B18" />
      {/* level meter (recorder) */}
      <g transform="translate(262 150)">
        <rect x="0" y="0" width="34" height="34" rx="3" fill="#1E1B18" />
        <rect
          x="6"
          y="6"
          width="22"
          height="22"
          fill="#E0A526"
          className={s.level}
          style={{ transform: `scaleY(${Math.max(0.04, Math.min(1, level))})` }}
        />
      </g>
    </svg>
  );
}
