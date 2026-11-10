// Builds src/api/index.js as a library twice (mock and real) and checks that the real-backend
// build contains no mock code or seed data. Usage: npm run check:mock-bundle
import { build } from 'vite';
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist-check');
// Strings that only exist in the mock layer and the seed world.
const MARKERS = [
  'Kempamma',
  'Shivalingaiah',
  'VT-7K3M-9QX2',
  'sample:hum:',
  'vt-mock-db-v1',
  'ಅಜ್ಜನ ಮೊದಲ ಗೊಂಬೆ',
];

async function bundle(mode, useMock) {
  const dir = join(out, mode);
  await build({
    root,
    configFile: false,
    logLevel: 'warn',
    define: { __VT_MOCK__: JSON.stringify(useMock) },
    build: {
      outDir: dir,
      emptyOutDir: true,
      minify: true,
      lib: { entry: join(root, 'src/api/index.js'), formats: ['es'], fileName: 'api' },
      rollupOptions: { external: ['axios'] },
    },
  });
  const text = readdirSync(dir)
    .filter((f) => f.endsWith('.js'))
    .map((f) => readFileSync(join(dir, f), 'utf8'))
    .join('\n');
  return { text, files: readdirSync(dir) };
}

const mock = await bundle('mock', true);
const real = await bundle('real', false);
const inMock = MARKERS.filter((m) => mock.text.includes(m));
const inReal = MARKERS.filter((m) => real.text.includes(m));

console.log(
  `mock build: ${mock.files.length} file(s), ${mock.text.length} bytes, markers found: ${inMock.length}/${MARKERS.length}`,
);
console.log(
  `real build: ${real.files.length} file(s), ${real.text.length} bytes, markers found: ${inReal.length}/${MARKERS.length}`,
);
rmSync(out, { recursive: true, force: true });

if (inMock.length === 0) {
  console.error('FAIL: the mock build has no seed markers, so this check proves nothing.');
  process.exit(1);
}
if (inReal.length > 0) {
  console.error(`FAIL: real build contains mock/seed data: ${inReal.join(', ')}`);
  process.exit(1);
}
console.log('PASS: the real-backend API bundle contains no mock code or seed data.');
