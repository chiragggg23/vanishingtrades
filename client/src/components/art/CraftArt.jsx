import { useId } from 'react';
import { between, pick, prng } from '../../lib/prng.js';
import s from './CraftArt.module.css';

const INK = '#1E1B18';
const PAPER = '#FAF5EA';
const DYES = ['#B8402E', '#25407A', '#E0A526', '#4F6B3A'];

// Each drawer returns { fill: [...], line: [...] } of SVG elements in a 200×200 box.
// "fill" is the colour plate, "line" is the key block (ink or pencil).
const drawers = {
  channapatna(r) {
    const kind = pick(r, ['horse', 'top', 'stack']);
    const c = [...DYES].sort(() => r() - 0.5);
    if (kind === 'top') {
      const w = between(r, 46, 58);
      return {
        fill: [
          <path key="b" d={`M${100 - w} 86 Q100 40 ${100 + w} 86 L100 158 Z`} fill={c[0]} />,
          <path
            key="s1"
            d={`M${100 - w * 0.86} 96 L${100 + w * 0.86} 96 L${100 + w * 0.7} 108 L${100 - w * 0.7} 108Z`}
            fill={c[2]}
          />,
          <path
            key="s2"
            d={`M${100 - w * 0.55} 122 L${100 + w * 0.55} 122 L${100 + w * 0.4} 134 L${100 - w * 0.4} 134Z`}
            fill={c[1]}
          />,
          <rect key="h" x="94" y="34" width="12" height="22" rx="4" fill={c[3]} />,
        ],
        line: [
          <path key="o" d={`M${100 - w} 86 Q100 40 ${100 + w} 86 L100 158 Z`} />,
          <path key="h" d="M94 56 V36 Q100 30 106 36 V56" />,
          <path key="l1" d={`M${100 - w * 0.86} 96 H${100 + w * 0.86}`} />,
          <path key="l2" d={`M${100 - w * 0.55} 122 H${100 + w * 0.55}`} />,
        ],
      };
    }
    if (kind === 'stack') {
      const rings = 3 + Math.floor(r() * 2);
      const fill = [];
      const line = [];
      for (let i = 0; i < rings; i++) {
        const y = 150 - i * 26;
        const w = 50 - i * 8;
        fill.push(<ellipse key={i} cx="100" cy={y} rx={w} ry="14" fill={c[i % 4]} />);
        line.push(<ellipse key={i} cx="100" cy={y} rx={w} ry="14" />);
      }
      const top = 150 - rings * 26;
      fill.push(<circle key="head" cx="100" cy={top + 4} r="15" fill={c[(rings + 1) % 4]} />);
      line.push(<circle key="head" cx="100" cy={top + 4} r="15" />);
      return { fill, line };
    }
    // rocking horse
    const lean = between(r, -4, 4);
    return {
      fill: [
        <path key="rock" d="M38 150 Q100 182 162 150 L156 160 Q100 192 44 160Z" fill={c[1]} />,
        <ellipse key="body" cx="100" cy="104" rx="44" ry="22" fill={c[0]} />,
        <path key="neck" d={`M128 98 L${146 + lean} 58 L${164 + lean} 66 L146 106Z`} fill={c[0]} />,
        <path key="saddle" d="M86 84 h28 v14 h-28z" fill={c[2]} />,
        <path key="mane" d={`M${140 + lean} 62 l-8 -10 l14 2z`} fill={c[3]} />,
      ],
      line: [
        <ellipse key="body" cx="100" cy="104" rx="44" ry="22" />,
        <path key="neck" d={`M128 98 L${146 + lean} 58 L${164 + lean} 66 L146 106`} />,
        <path key="legs" d="M72 120 L62 152 M84 124 L80 156 M118 124 L122 156 M130 120 L140 152" />,
        <path key="rock" d="M38 150 Q100 182 162 150" />,
        <circle key="eye" cx={154 + lean} cy="68" r="2" fill={INK} />,
      ],
    };
  },

  bidriware(r) {
    const neck = between(r, 14, 22);
    const belly = between(r, 46, 56);
    const body = `M${100 - neck / 2} 34 L${100 - neck / 2} 70 Q${100 - belly} 92 ${100 - belly} 124 Q${100 - belly} 162 100 164 Q${100 + belly} 162 ${100 + belly} 124 Q${100 + belly} 92 ${100 + neck / 2} 70 L${100 + neck / 2} 34Z`;
    const motif = pick(r, ['poppy', 'vine', 'scale']);
    const silver = [];
    if (motif === 'poppy') {
      for (let i = 0; i < 5; i++) {
        const x = 100 + (i - 2) * 18;
        const y = 122 + (i % 2) * 10;
        silver.push(
          <g key={i} transform={`translate(${x} ${y})`}>
            <circle r="6" fill={PAPER} />
            <circle r="2" fill={INK} />
          </g>,
        );
      }
    } else if (motif === 'vine') {
      silver.push(
        <path
          key="v"
          d={`M${100 - belly + 10} 120 C 80 100, 90 150, 100 124 S 130 100, ${100 + belly - 10} 128`}
          stroke={PAPER}
          strokeWidth="4"
          fill="none"
        />,
      );
      for (let i = 0; i < 4; i++)
        silver.push(
          <ellipse
            key={`l${i}`}
            cx={76 + i * 16}
            cy={112 + (i % 2) * 22}
            rx="5"
            ry="3"
            fill={PAPER}
          />,
        );
    } else {
      for (let row = 0; row < 3; row++)
        for (let i = 0; i < 5; i++)
          silver.push(
            <path
              key={`${row}-${i}`}
              d={`M${66 + i * 14 + (row % 2) * 7} ${108 + row * 12} q7 8 14 0`}
              stroke={PAPER}
              strokeWidth="2.5"
              fill="none"
            />,
          );
    }
    return {
      fill: [
        <path key="b" d={body} fill="#2A2622" />,
        ...silver,
        <rect key="rim" x={100 - neck / 2 - 4} y="30" width={neck + 8} height="7" fill={PAPER} />,
      ],
      line: [
        <path key="b" d={body} />,
        <path key="band" d={`M${100 - belly + 6} 100 Q100 108 ${100 + belly - 6} 100`} />,
      ],
    };
  },

  ilkal(r) {
    const body = pick(r, ['#4F6B3A', '#25407A', '#1E1B18']);
    const fill = [];
    const line = [];
    for (let i = 0; i < 3; i++) {
      const y = 62 + i * 30;
      fill.push(
        <rect
          key={`f${i}`}
          x={34 + i * 4}
          y={y}
          width={132 - i * 8}
          height="26"
          fill={i === 2 ? '#B8402E' : body}
        />,
      );
      line.push(<rect key={`f${i}`} x={34 + i * 4} y={y} width={132 - i * 8} height="26" />);
    }
    // tope teni: fort-wall triangles across the pallu
    const teeth = 8;
    for (let i = 0; i < teeth; i++) {
      const x = 44 + i * (112 / teeth);
      fill.push(
        <path
          key={`t${i}`}
          d={`M${x} 150 l${112 / teeth / 2} -12 l${112 / teeth / 2} 12Z`}
          fill="#FAF5EA"
        />,
      );
    }
    // checks in the body
    for (let i = 0; i < 6; i++)
      line.push(
        <path key={`c${i}`} d={`M${46 + i * 20} 64 v54`} strokeDasharray="2 5" strokeWidth="1.4" />,
      );
    fill.push(<rect key="border" x="34" y="56" width="132" height="6" fill="#E0A526" />);
    return { fill, line };
  },

  kinhal(r) {
    const tail = between(r, 24, 40);
    const body = '#4F6B3A';
    return {
      fill: [
        <path
          key="tail"
          d={`M70 128 L${70 - tail} ${158 + tail / 4} L${80 - tail / 3} 166 L84 136Z`}
          fill="#25407A"
        />,
        <ellipse key="body" cx="100" cy="110" rx="34" ry="42" fill={body} />,
        <circle key="head" cx="116" cy="64" r="20" fill={body} />,
        <path key="beak" d="M132 62 q14 2 10 16 q-8 -8 -12 -6z" fill="#B8402E" />,
        <path key="wing" d="M84 96 q24 -10 36 18 q-18 22 -38 6z" fill="#E0A526" />,
        <rect key="perch" x="56" y="152" width="96" height="8" rx="2" fill="#B8402E" />,
      ],
      line: [
        <ellipse key="body" cx="100" cy="110" rx="34" ry="42" />,
        <circle key="head" cx="116" cy="64" r="20" />,
        <path key="wing" d="M84 96 q24 -10 36 18 q-18 22 -38 6z" />,
        <path key="wing2" d="M92 104 q10 0 18 10 M90 112 q10 0 16 8" />,
        <circle key="eye" cx="122" cy="60" r="3" fill={INK} />,
        <path key="perch" d="M56 156 H152" />,
      ],
    };
  },

  'rosewood-inlay'(r) {
    const trunkUp = r() > 0.5;
    const fill = [
      <rect key="panel" x="30" y="44" width="140" height="112" fill="#5A2A1E" />,
      <path
        key="el"
        d={`M58 128 Q56 92 90 88 Q120 84 138 96 Q152 104 150 ${trunkUp ? 84 : 128} Q156 ${trunkUp ? 76 : 132} 160 ${trunkUp ? 86 : 124} Q160 110 146 116 L142 136 L130 136 L128 122 L84 122 L80 136 L68 136 Z`}
        fill="#E9D5A8"
      />,
      <path key="cloth" d="M84 92 h40 v26 h-40z" fill="#B8402E" />,
    ];
    for (let i = 0; i < 9; i++)
      fill.push(<circle key={`d${i}`} cx={40 + i * 15} cy="52" r="2.4" fill="#E9D5A8" />);
    for (let i = 0; i < 9; i++)
      fill.push(<circle key={`e${i}`} cx={40 + i * 15} cy="148" r="2.4" fill="#E9D5A8" />);
    return {
      fill,
      line: [
        <rect key="panel" x="30" y="44" width="140" height="112" />,
        <rect key="in" x="36" y="58" width="128" height="84" strokeDasharray="1 4" />,
        <circle key="eye" cx="132" cy="98" r="2" fill={INK} />,
      ],
    };
  },

  pottery(r) {
    const w = between(r, 48, 60);
    const neck = between(r, 18, 26);
    const pot = `M${100 - neck} 52 Q${100 - neck - 4} 66 ${100 - w} 96 Q${100 - w - 8} 140 100 162 Q${100 + w + 8} 140 ${100 + w} 96 Q${100 + neck + 4} 66 ${100 + neck} 52Z`;
    const band = [];
    const n = 7;
    for (let i = 0; i < n; i++)
      band.push(
        <path
          key={i}
          d={`M${100 - w + 10 + (i * (2 * w - 20)) / n} 104 l${(2 * w - 20) / n / 2} 10 l${(2 * w - 20) / n / 2} -10`}
        />,
      );
    return {
      fill: [
        <path key="p" d={pot} fill="#B8402E" />,
        <rect
          key="lip"
          x={100 - neck - 6}
          y="46"
          width={2 * neck + 12}
          height="8"
          rx="3"
          fill="#8E3324"
        />,
        <path
          key="band"
          d={`M${100 - w + 2} 100 H${100 + w - 2} V118 H${100 - w + 2}Z`}
          fill="#E0A526"
        />,
      ],
      line: [
        <path key="p" d={pot} />,
        ...band,
        <path key="shine" d={`M${100 - w + 14} 128 q4 18 18 24`} strokeWidth="1.5" />,
      ],
    };
  },
};

/**
 * Seeded block-print illustration for a craft type.
 * variant: "color" | "outline" | "fade"; active (fade only): show the colour plate.
 */
export default function CraftArt({
  craftType = 'pottery',
  seed = '',
  variant = 'color',
  active = false,
  title,
  className = '',
}) {
  const uid = useId().replace(/:/g, '');
  const rand = prng(`${craftType}:${seed}`);
  const draw = drawers[craftType] || drawers.pottery;
  const { fill, line } = draw(rand);
  const misX = between(rand, 1.5, 3.2);
  const misY = between(rand, -1.5, 2);
  const shadowW = between(rand, 58, 74);
  const decorative = !title;
  return (
    <svg
      viewBox="0 0 200 200"
      className={`${s.art} ${className}`}
      data-variant={variant}
      data-active={active ? 'true' : 'false'}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={title}
      focusable="false"
    >
      <defs>
        <pattern id={`ht${uid}`} width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.2" fill="rgba(30,27,24,0.28)" />
        </pattern>
      </defs>
      {/* ground shadow anchors the object */}
      <ellipse cx="100" cy="172" rx={shadowW} ry="9" fill={`url(#ht${uid})`} className={s.shadow} />
      {variant !== 'outline' && (
        <g className={s.colour} style={{ '--mx': `${misX}px`, '--my': `${misY}px` }}>
          {fill}
        </g>
      )}
      <g
        className={variant === 'color' ? s.key : s.pencil}
        fill="none"
        stroke={variant === 'color' ? INK : '#8A7F70'}
        strokeWidth={variant === 'color' ? 2.6 : 1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {line}
      </g>
    </svg>
  );
}
