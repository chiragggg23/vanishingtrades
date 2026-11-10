// Lists translation keys used in src/ and checks them against the locale files.
// Usage: node scripts/i18n-keys.mjs [--list]   (exits 1 when a key is missing in en/kn/hi)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');

// Keys built at runtime from a known set of values (t(`craft.${key}`) and so on).
import { CRAFT_KEYS, ROLES, LANGS, ROADMAP_STEPS } from '../../shared/constants.js';
const DYNAMIC = [
  ...CRAFT_KEYS.map((k) => `craft.${k}`),
  ...ROLES.map((r) => `role.${r}`),
  ...LANGS.map((l) => `lang.name.${l}`),
  ...ROADMAP_STEPS.map((s) => `roadmap.${s.key}`),
  ...ROADMAP_STEPS.map((s) => `roadmapHint.${s.key}`),
  ...[4, 8, 11].flatMap((g) => [`sdg.g${g}.name`, `sdg.g${g}.short`]),
  ...[
    'draft',
    'pending',
    'approved',
    'rejected',
    'open',
    'answered',
    'closed',
    'applied',
    'shortlisted',
    'accepted',
    'completed',
    'resolved',
    'active',
    'paused',
  ].map((s) => `status.${s}`),
  ...['newest', 'oldest', 'price-asc', 'price-desc', 'title'].map((s) => `gallery.sort.${s}`),
  ...['newest', 'oldest', 'most-played'].map((s) => `archive.sort.${s}`),
  ...['deadline', 'newest'].map((s) => `appr.sort.${s}`),
  ...['open', 'closed', 'all'].map((s) => `appr.show.${s}`),
  ...['record', 'keep', 'pass'].flatMap((p) =>
    ['title', 'body', 'goal', 'link'].map((f) => `home.panel.${p}.${f}`),
  ),
  ...['sdg8', 'sdg11', 'sdg4'].flatMap((g) => [`impact.why.${g}`, `impact.chart.${g}`]),
  ...[
    'artisans',
    'works',
    'enquiries',
    'enquiriesAnswered',
    'storiesArchived',
    'languages',
    'minutesRecorded',
    'plays',
    'openings',
    'applications',
    'learnersInTraining',
    'certificates',
  ].map((f) => `impact.f.${f}`),
  ...['enquiries', 'works', 'submitted', 'approved', 'applications', 'certificates'].map(
    (f) => `impact.series.${f}`,
  ),
  ...['worksByCraft', 'storiesByLanguage', 'applicationsByStatus'].map(
    (f) => `impact.breakdown.${f}`,
  ),
  ...['stories', 'works', 'enquiries', 'openings', 'profile'].map((k) => `dash.tab.${k}`),
  ...['impact', 'users', 'moderation', 'audit'].map((k) => `admin.tab.${k}`),
  ...['open', 'resolved', 'all'].map((k) => `admin.flagStatus.${k}`),
  ...['story', 'craft', 'artisan'].map((k) => `admin.target.${k}`),
  ...['dismissed', 'removed'].map((k) => `admin.resolution.${k}`),
  ...['applied', 'shortlisted', 'rejected'].map((k) => `learner.status.${k}`),
  ...['artisan', 'learner', 'buyer'].flatMap((r) => [`auth.roleTitle.${r}`, `auth.roleHint.${r}`]),
  'recorder.blocked',
  'recorder.noMic',
  'recorder.busy',
  'recorder.failed',
];

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(jsx?|mjs)$/.test(f) && !/\.test\./.test(f)) out.push(p);
  }
  return out;
}

export function usedKeys() {
  const keys = new Set(DYNAMIC);
  for (const file of walk(src)) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/\bt\(\s*'([a-zA-Z0-9_.-]+)'/g)) keys.add(m[1]);
  }
  return [...keys].sort();
}

const flat = (obj, prefix = '', out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') flat(v, key, out);
    else out[key] = v;
  }
  return out;
};
export const loadLocale = (lng) =>
  flat(JSON.parse(readFileSync(join(src, 'i18n', 'locales', `${lng}.json`), 'utf8')));

// i18next plural keys: "key_one"/"key_other" satisfy "key".
const has = (dict, key) => key in dict || `${key}_other` in dict;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const keys = usedKeys();
  if (process.argv.includes('--list')) {
    console.log(keys.join('\n'));
    process.exit(0);
  }
  let missing = 0;
  for (const lng of ['en', 'kn', 'hi']) {
    let dict = {};
    try {
      dict = loadLocale(lng);
    } catch {
      console.log(`${lng}: locale file missing`);
      missing++;
      continue;
    }
    const gaps = keys.filter((k) => !has(dict, k));
    missing += gaps.length;
    console.log(
      `${lng}: ${keys.length - gaps.length}/${keys.length} keys${gaps.length ? `, missing: ${gaps.join(', ')}` : ''}`,
    );
  }
  process.exit(missing ? 1 : 0);
}
