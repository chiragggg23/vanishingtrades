import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import {
  extensionFor,
  levelFromBytes,
  micErrorKey,
  pickMimeType,
  canRecord,
} from '../components/story/recorderUtils.js';
import { schemas, validate, sanitize } from '../../../shared/validation.js';
import { matchesAllWords, mongoAllWords, pageParams } from '../../../shared/search.js';
import { certCode, CERT_RE, canMoveApplication } from '../../../shared/rules.js';
import { synthHumWav } from '../../../shared/wav.js';
import { buildSeed, SEED_CERT_CODE } from '../../../shared/seed.js';
import { prng, tiltFor } from '../lib/prng.js';

const root = join(__dirname, '..', '..');

describe('recorder helpers', () => {
  it('picks the first mimeType the browser supports, Safari falls back to mp4', () => {
    const chrome = { isTypeSupported: (t) => t.startsWith('audio/webm') };
    const safari = { isTypeSupported: (t) => t.startsWith('audio/mp4') };
    expect(pickMimeType(chrome)).toBe('audio/webm;codecs=opus');
    expect(pickMimeType(safari)).toBe('audio/mp4;codecs=mp4a.40.2');
    expect(pickMimeType({})).toBe('');
    expect(extensionFor('audio/mp4;codecs=mp4a.40.2')).toBe('m4a');
    expect(extensionFor('audio/webm;codecs=opus')).toBe('webm');
  });
  it('detects support and maps microphone errors to friendly messages', () => {
    expect(
      canRecord({ navigator: { mediaDevices: { getUserMedia() {} } }, MediaRecorder() {} }),
    ).toBe(true);
    expect(canRecord({ navigator: {} })).toBe(false);
    expect(micErrorKey({ name: 'NotAllowedError' })).toBe('recorder.blocked');
    expect(micErrorKey({ name: 'NotFoundError' })).toBe('recorder.noMic');
    expect(micErrorKey({ name: 'Whatever' })).toBe('recorder.failed');
  });
  it('turns time-domain samples into a level between 0 and 1', () => {
    expect(levelFromBytes(new Uint8Array(64).fill(128))).toBe(0);
    const loud = new Uint8Array(64).map((_, i) => (i % 2 ? 255 : 0));
    expect(levelFromBytes(loud)).toBe(1);
  });
});

describe('shared validation', () => {
  it('reports every failing field with its path', () => {
    const r = validate(schemas.craft, {
      title: { en: 'ab' },
      craftType: 'lego',
      description: { en: 'short' },
      materials: ['x'],
      priceMin: 50,
      priceMax: 10,
    });
    expect(r.ok).toBe(false);
    expect(r.errors).toEqual({
      'title.en': 'Use at least 3 characters.',
      craftType: expect.stringContaining('Choose one of'),
      'description.en': 'Use at least 10 characters.',
      'materials.0': 'Use at least 2 characters.',
      priceMax: 'The highest price must be at least the lowest price.',
    });
  });
  it('allows partial updates but still checks what is sent', () => {
    expect(validate(schemas.storyUpdate, { tags: ['ok'] }, { partial: true }).ok).toBe(true);
    expect(validate(schemas.storyUpdate, { title: '' }, { partial: true }).errors.title).toBe(
      'This is required.',
    );
  });
  it('strips operator-injection keys', () => {
    expect(sanitize({ email: { $gt: '' }, 'a.b': 1, ok: [{ $where: 1, x: 2 }] })).toEqual({
      email: {},
      ok: [{ x: 2 }],
    });
  });
});

describe('shared search, rules and seed', () => {
  it('matches only when every word appears in some field', () => {
    expect(matchesAllWords('silver VINE', ['Bangle box', 'silver vine pattern'])).toBe(true);
    expect(matchesAllWords('silver lotus', ['Bangle box', 'silver vine'])).toBe(false);
    expect(matchesAllWords('', ['anything'])).toBe(true);
    expect(mongoAllWords('a.b c', ['title']).$and[0].$or[0].title.$regex).toBe('a\\.b');
  });
  it('clamps pagination', () => {
    expect(pageParams({ page: '0', limit: '500' })).toEqual({ page: 1, limit: 50, skip: 0 });
  });
  it('makes certificate codes in the documented format and enforces application moves', () => {
    for (let i = 0; i < 50; i++) expect(certCode()).toMatch(CERT_RE);
    expect(SEED_CERT_CODE).toMatch(CERT_RE);
    expect(canMoveApplication('applied', 'accepted')).toBe(true);
    expect(canMoveApplication('rejected', 'accepted')).toBe(false);
  });
  it('builds the documented demo world', () => {
    const s = buildSeed(new Date('2026-11-10T00:00:00Z'));
    expect(s.artisans).toHaveLength(12);
    expect(s.crafts).toHaveLength(24);
    expect(s.stories).toHaveLength(13);
    expect(s.stories.filter((x) => x.status === 'approved')).toHaveLength(9);
    expect(new Set(s.stories.map((x) => x.language))).toEqual(new Set(['kn', 'hi', 'en']));
    expect(s.apprenticeships).toHaveLength(6);
    expect(s.flags.filter((f) => f.status === 'open')).toHaveLength(3);
    expect(s.users.filter((u) => u.email.startsWith('demo-'))).toHaveLength(5);
  });
  it('synthesises a valid WAV hum', () => {
    const wav = synthHumWav('x', 1, 8000);
    expect(String.fromCharCode(...wav.slice(0, 4))).toBe('RIFF');
    expect(wav.length).toBe(44 + 8000 * 2);
  });
  it('seeded art and tilt are stable', () => {
    expect(prng('a')()).toBe(prng('a')());
    expect(tiltFor('abc')).toBe(tiltFor('abc'));
    expect(Math.abs(tiltFor('xyz', 2))).toBeLessThanOrEqual(2);
  });
});

describe('project scripts', () => {
  it('every translation key exists in English, Kannada and Hindi', () => {
    const out = execFileSync(process.execPath, [join(root, 'scripts/i18n-keys.mjs')], {
      encoding: 'utf8',
    });
    expect(out).toMatch(/kn: (\d+)\/\1 keys/);
    expect(out).toMatch(/hi: (\d+)\/\1 keys/);
  });
  it('every text colour pair passes WCAG AA', () => {
    const out = execFileSync(process.execPath, [join(root, 'scripts/contrast.mjs')], {
      encoding: 'utf8',
    });
    expect(out).toContain('All text pairs pass WCAG AA.');
  });
});
