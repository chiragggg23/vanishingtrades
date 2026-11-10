// Reports the JavaScript a first visit downloads: the entry script plus every chunk index.html
// preloads, raw and gzipped. Run after a build: npm run build && npm run size
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const dist = join(import.meta.dirname, '..', 'dist');
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const initial = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)].map((m) => m[1]);
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
let raw = 0;
let gz = 0;
for (const f of initial) {
  const buf = readFileSync(join(dist, f));
  const z = gzipSync(buf, { level: 9 }).length;
  raw += buf.length;
  gz += z;
  console.log(`${f.padEnd(40)} ${kb(buf.length).padStart(10)} ${kb(z).padStart(10)} gz`);
}
console.log(`initial JavaScript: ${kb(raw)} raw, ${kb(gz)} gzipped (${initial.length} files)`);
const all = readdirSync(join(dist, 'assets')).filter((f) => f.endsWith('.js'));
const total = all.reduce((s, f) => s + gzipSync(readFileSync(join(dist, 'assets', f))).length, 0);
console.log(
  `all JavaScript chunks: ${all.length} files, ${kb(total)} gzipped (most load only on demand)`,
);
