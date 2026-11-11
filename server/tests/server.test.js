import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import sharp from 'sharp';
import { config } from '../src/config/env.js';
import { User } from '../src/models/index.js';
import { seedWorld } from '../src/seed/seedWorld.js';
import { processStory } from '../src/services/ai/index.js';
import { oid } from '../../shared/seed.js';
import { DEMO, serverDriver, startDb, stopDb } from './helpers.js';

let api;
let app;
const login = async (role) =>
  (await api.call('POST', '/auth/login', { body: DEMO(role) })).body.data.token;

beforeAll(async () => {
  await startDb();
  api = serverDriver();
  app = api.app;
});
afterAll(stopDb);
beforeEach(() => api.reset());

describe('basics', () => {
  it('reports health and wraps unknown endpoints in the envelope', async () => {
    expect((await request(app).get('/health')).body).toEqual({ success: true, data: { ok: true } });
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'No such endpoint.' });
  });
  it('rejects malformed JSON and oversized bodies with the envelope', async () => {
    const bad = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');
    expect(bad.status).toBe(400);
    expect(bad.body.success).toBe(false);
    const big = await request(app)
      .post('/api/auth/login')
      .send({ email: 'x'.repeat(300 * 1024), password: 'y' });
    expect(big.status).toBe(413);
  });
  it('sets security headers and honours the CORS allow-list', async () => {
    const ok = await request(app).get('/api/craft-types').set('Origin', 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(ok.headers['x-content-type-options']).toBe('nosniff');
    expect(ok.headers['x-powered-by']).toBeUndefined();
    const evil = await request(app).get('/api/craft-types').set('Origin', 'https://evil.example');
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('auth and accounts', () => {
  it('stores bcrypt hashes and never returns them', async () => {
    const u = await User.findOne({ email: 'demo-admin@vanishingtrades.test' }).lean();
    expect(u.passwordHash).toMatch(/^\$2[aby]\$/);
    const doc = await User.findById(u._id);
    expect(JSON.stringify(doc.toJSON())).not.toContain('passwordHash');
    const me = await api.call('GET', '/auth/me', { token: await login('admin') });
    expect(JSON.stringify(me.body)).not.toMatch(/password/i);
  });
  it('rejects expired tokens, tokens signed with another secret, and deleted users', async () => {
    const id = oid('a1', 3);
    const expired = jwt.sign({ sub: id }, config.jwtSecret, { expiresIn: -10 });
    const forged = jwt.sign({ sub: id }, 'not-the-secret');
    for (const token of [expired, forged])
      expect((await api.call('GET', '/auth/me', { token })).status).toBe(401);
    const token = await login('buyer');
    await User.deleteOne({ _id: id });
    expect((await api.call('GET', '/auth/me', { token })).status).toBe(401);
  });
  it('rejects unsigned (alg: none) tokens', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ sub: oid('a1', 5), tv: 0 })).toString('base64url');
    expect((await api.call('GET', '/auth/me', { token: `${header}.${body}.` })).status).toBe(401);
  });
  it('runs bcrypt even for an unknown email, so timing does not reveal accounts', async () => {
    const spy = vi.spyOn(bcrypt, 'compare');
    try {
      const res = await api.call('POST', '/auth/login', {
        body: { email: 'nobody-here@example.com', password: 'wrong-password' },
      });
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Email or password is wrong.');
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });
  it('refuses to start in production without JWT_SECRET', () => {
    const script = "import('./src/config/env.js').then(() => console.log('started'))";
    let out = '';
    try {
      out = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
        cwd: join(import.meta.dirname, '..'),
        env: { ...process.env, NODE_ENV: 'production', JWT_SECRET: '', VITEST: '' },
        encoding: 'utf8',
        stdio: 'pipe',
      });
    } catch (err) {
      out = String(err.stderr);
    }
    expect(out).toContain('JWT_SECRET must be set in production');
  });
});

describe('rate limits', () => {
  afterEach(() => {
    config.rateLimits.disabled = true;
  });
  it('limits sign-in attempts per IP', async () => {
    config.rateLimits.disabled = false;
    const app2 = (await import('../src/app.js')).createApp();
    let last;
    for (let i = 0; i < 31; i++)
      last = await request(app2).post('/api/auth/login').send({ email: 'a@b.cd', password: 'x' });
    expect(last.status).toBe(429);
    expect(last.body.success).toBe(false);
  });
});

describe('uploads', () => {
  it('re-encodes images to JPEG at most 800 px and serves them', async () => {
    const png = await sharp({
      create: { width: 2000, height: 1000, channels: 3, background: '#B8402E' },
    })
      .png()
      .toBuffer();
    const res = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${await login('artisan')}`)
      .attach('image', png, { filename: 'big.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.data.url).toMatch(/^\/uploads\/images\/.+\.jpg$/);
    const served = await request(app).get(res.body.data.url).buffer(true);
    expect(served.status).toBe(200);
    const meta = await sharp(served.body).metadata();
    expect(meta.format).toBe('jpeg');
    expect(Math.max(meta.width, meta.height)).toBe(800);
  });
  it('refuses non-images (422) and images over 5 MB (413)', async () => {
    const token = await login('buyer');
    const txt = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(txt.status).toBe(422);
    expect(txt.body.errors).toHaveProperty('image');
    const huge = await request(app)
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', Buffer.alloc(5 * 1024 * 1024 + 10), {
        filename: 'a.jpg',
        contentType: 'image/jpeg',
      });
    expect(huge.status).toBe(413);
  });
  it('stores story audio on disk and refuses recordings over 10 MB', async () => {
    const token = await login('artisan');
    const story = oid('a4', 13);
    const res = await request(app)
      .post(`/api/stories/${story}/audio`)
      .set('Authorization', `Bearer ${token}`)
      .field('durationSec', '3.5')
      .attach('audio', Buffer.alloc(4000, 7), {
        filename: 's.webm',
        contentType: 'audio/webm;codecs=opus',
      });
    expect(res.status).toBe(200);
    expect(
      existsSync(join(config.uploadsDir, res.body.data.audioUrl.replace('/uploads/', ''))),
    ).toBe(true);
    const big = await request(app)
      .post(`/api/stories/${story}/audio`)
      .set('Authorization', `Bearer ${token}`)
      .field('durationSec', '3')
      .attach('audio', Buffer.alloc(10 * 1024 * 1024 + 10), {
        filename: 's.webm',
        contentType: 'audio/webm',
      });
    expect(big.status).toBe(413);
  });
});

describe('privacy', () => {
  it('never returns learner emails on public endpoints', async () => {
    const paths = [
      '/artisans',
      `/artisans/${oid('a2', 1)}`,
      '/apprenticeships?status=all',
      '/archive',
      `/archive/${oid('a4', 1)}`,
      '/crafts',
      '/impact',
      '/certificates/VT-7K3M-9QX2',
    ];
    for (const p of paths) {
      const res = await request(app).get(`/api${p}`);
      expect(res.status, p).toBe(200);
      expect(JSON.stringify(res.body), p).not.toMatch(/@learners\.|demo-learner@|"email"/);
    }
    const applicants = await api.call('GET', `/apprenticeships/${oid('a6', 1)}/applications`, {
      token: await login('artisan'),
    });
    expect(JSON.stringify(applicants.body)).not.toContain('@');
  });
});

describe('AI provider', () => {
  const story = {
    id: 'x',
    language: 'kn',
    text: 'ಒಂದು ವಾಕ್ಯ. ಇನ್ನೊಂದು ವಾಕ್ಯ.',
    audioUrl: null,
    durationSec: null,
  };
  afterEach(() => {
    config.ai.provider = 'mock';
    config.ai.groqKey = '';
    vi.unstubAllGlobals();
  });
  it('uses the deterministic mock by default (isSample true)', async () => {
    const r = await processStory(story);
    expect(r.ai).toMatchObject({ provider: 'mock', isSample: true });
    expect(r.translation[0].text).toMatch(/^\[Sample translation\]/);
  });
  it('falls back to the mock when the real provider fails', async () => {
    config.ai.provider = 'groq';
    config.ai.groqKey = 'test';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503 })),
    );
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = await processStory(story);
    expect(r.ai.isSample).toBe(true);
  });
  it('marks real results isSample false', async () => {
    config.ai.provider = 'groq';
    config.ai.groqKey = 'test';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  lines: ['One sentence.', 'Another sentence.'],
                  summary: 'Two sentences.',
                }),
              },
            },
          ],
        }),
      })),
    );
    const r = await processStory(story);
    expect(r.ai).toMatchObject({ provider: 'groq', isSample: false });
    expect(r.translation.map((s) => s.text)).toEqual(['One sentence.', 'Another sentence.']);
  });
});

describe('seeding and demo mode', () => {
  it('loads the documented demo world, with WAV files for sample stories', async () => {
    const counts = await seedWorld({ writeAudio: true });
    expect(counts).toMatchObject({
      users: 19,
      artisans: 12,
      crafts: 24,
      stories: 13,
      apprenticeships: 6,
      certificates: 1,
      flags: 3,
    });
    const wav = join(config.uploadsDir, 'audio', `seed-${oid('a4', 1)}.wav`);
    expect(existsSync(wav)).toBe(true);
    const played = await request(app).get(`/uploads/audio/seed-${oid('a4', 1)}.wav`);
    expect(played.status).toBe(200);
  });
  it('can seed without usable demo logins', async () => {
    await seedWorld({ writeAudio: false, demoAccounts: false });
    expect((await api.call('POST', '/auth/login', { body: DEMO('admin') })).status).toBe(401);
  });
  it('resets the demo only in demo mode', async () => {
    expect((await api.call('GET', '/demo')).body.data.enabled).toBe(true);
    expect((await api.call('POST', '/demo/reset')).status).toBe(200);
    config.demoMode = false;
    try {
      expect((await api.call('POST', '/demo/reset')).status).toBe(404);
      expect((await api.call('GET', '/demo')).body.data).toEqual({ enabled: false, accounts: [] });
    } finally {
      config.demoMode = true;
    }
  });
});
