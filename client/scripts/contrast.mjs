// Computes WCAG 2.x contrast ratios for every text/background pair the UI uses.
// Usage: node scripts/contrast.mjs   (exits 1 if a pair used for text fails AA)
const C = {
  paper: '#F3EAD8',
  paperDark: '#E4D6BA',
  paperLight: '#FAF5EA',
  ink: '#1E1B18',
  inkSoft: '#4A4239',
  indigo: '#25407A',
  madder: '#B8402E',
  madderDeep: '#9C3424',
  turmeric: '#E0A526',
  leaf: '#4F6B3A',
  leafDeep: '#3F5730',
  sdg4: '#C5192D',
  sdg8: '#A21942',
  sdg11: '#FD9D24',
  lampPaper: '#17243F',
  lampText: '#F3EAD8',
  lampMuted: '#D9CDB4',
  lampLink: '#F2C25B',
  lampDanger: '#F08A73',
  lampSuccess: '#A9C98C',
};

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
export const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

// [foreground, background, usage, large?]  large = ≥24px or ≥18.66px bold (needs 3:1)
const PAIRS = [
  ['ink', 'paper', 'body text'],
  ['ink', 'paperDark', 'body text on panels'],
  ['ink', 'paperLight', 'form inputs'],
  ['inkSoft', 'paper', 'muted text'],
  ['inkSoft', 'paperDark', 'muted text on panels'],
  ['indigo', 'paper', 'links'],
  ['indigo', 'paperDark', 'links on panels'],
  ['madder', 'paper', 'madder text on paper'],
  ['madderDeep', 'paperDark', 'madder text on dark paper'],
  ['madderDeep', 'paper', 'errors, hand notes'],
  ['leaf', 'paper', 'success on paper'],
  ['leafDeep', 'paperDark', 'success on dark paper'],
  ['paper', 'indigo', 'primary button / indigo panels'],
  ['paper', 'ink', 'dark strips'],
  ['paper', 'madder', 'madder stamp text', true],
  ['paper', 'madderDeep', 'danger button'],
  ['paper', 'leafDeep', 'approved badge'],
  ['ink', 'turmeric', 'turmeric sticker text'],
  ['paper', 'sdg4', 'SDG 4 stamp'],
  ['paper', 'sdg8', 'SDG 8 stamp'],
  ['ink', 'sdg11', 'SDG 11 stamp'],
  ['lampText', 'lampPaper', 'lamp mode body'],
  ['lampMuted', 'lampPaper', 'lamp mode muted'],
  ['lampLink', 'lampPaper', 'lamp mode links'],
  ['lampDanger', 'lampPaper', 'lamp mode errors'],
  ['lampSuccess', 'lampPaper', 'lamp mode success'],
];
// Known failures we keep out of text on purpose (documented, not used for text):
const DECORATION_ONLY = [
  ['turmeric', 'paper', 'turmeric is fill/thread only'],
  ['madder', 'paperDark', 'use madderDeep instead'],
  ['leaf', 'paperDark', 'use leafDeep instead'],
];

let failed = 0;
const row = (fg, bg, use, large, decorative) => {
  const r = ratio(C[fg], C[bg]);
  const need = large ? 3 : 4.5;
  const ok = r >= need;
  if (!ok && !decorative) failed++;
  const mark = decorative ? (ok ? 'ok  ' : 'deco') : ok ? 'PASS' : 'FAIL';
  console.log(
    `${mark}  ${r.toFixed(2).padStart(5)}:1  ${fg.padEnd(11)} on ${bg.padEnd(11)} ${use}${large ? ' (large)' : ''}`,
  );
};
console.log('Text pairs (AA: 4.5:1, large 3:1)');
PAIRS.forEach(([f, b, u, l]) => row(f, b, u, l, false));
console.log('\nDecoration-only pairs (never used for text)');
DECORATION_ONLY.forEach(([f, b, u]) => row(f, b, u, false, true));
console.log(failed ? `\n${failed} text pair(s) fail AA` : '\nAll text pairs pass WCAG AA.');
process.exit(failed ? 1 : 0);
