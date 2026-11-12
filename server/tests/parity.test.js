// Contract parity: every scenario runs against the browser mock AND the real server. Each run
// asserts the expected statuses itself, and the two runs must record identical status codes,
// response shapes (types of every field, array lengths) and selected values.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { oid, SEED_CERT_CODE } from '../../shared/seed.js';
import { CERT_RE } from '../../shared/rules.js';
import { ROLES } from '../../shared/constants.js';
import { mockDriver, recorder, serverDriver, startDb, stopDb } from './helpers.js';

const U = (n) => oid('a1', n);
const A = (n) => oid('a2', n);
const C = (n) => oid('a3', n);
const S = (n) => oid('a4', n);
const E = (n) => oid('a5', n);
const P = (n) => oid('a6', n);
const AP = (n) => oid('a7', n);
const F = (n) => oid('a8', n);

const page = (b) => b.data?.pagination;
const titles = (b) => b.data?.items?.map((i) => i.title?.en ?? i.title ?? i.name);
const errKeys = (b) => Object.keys(b.errors || {}).sort();
const msg = (b) => b.message;
const AUDIO = { name: 'story.webm', type: 'audio/webm', buffer: Buffer.alloc(2048, 1) };
const NOT_AUDIO = { name: 'notes.txt', type: 'text/plain', buffer: Buffer.from('hello') };
const future = (days) => new Date(Date.now() + days * 86400000).toISOString();

const scenarios = {
  async 'login for each role, and failures'(api) {
    for (const role of ROLES) {
      const r = await api.call(
        `login ${role}`,
        'POST',
        '/auth/login',
        {
          body: { email: `demo-${role}@vanishingtrades.test`, password: 'demo1234' },
        },
        (b) => {
          const { createdAt: _c, id: _i, ...u } = b.data.user;
          return u;
        },
      );
      expect(r.status).toBe(200);
      const me = await api.call(
        `me ${role}`,
        'GET',
        '/auth/me',
        { token: r.body.data.token },
        (b) => b.data.role,
      );
      expect(me.body.data.role).toBe(role);
    }
    const bad = await api.call(
      'wrong password',
      'POST',
      '/auth/login',
      {
        body: { email: 'demo-buyer@vanishingtrades.test', password: 'nope' },
      },
      msg,
    );
    expect(bad.status).toBe(401);
    const invalid = await api.call(
      'invalid login body',
      'POST',
      '/auth/login',
      { body: { email: 'x' } },
      errKeys,
    );
    expect(invalid.status).toBe(422);
    const inj = await api.call(
      'operator injection',
      'POST',
      '/auth/login',
      {
        body: { email: { $gt: '' }, password: { $gt: '' } },
      },
      errKeys,
    );
    expect(inj.status).toBe(422);
    const reg = await api.call(
      'register reviewer is refused',
      'POST',
      '/auth/register',
      {
        body: { name: 'Sly', email: 'sly@example.com', password: 'longenough', role: 'reviewer' },
      },
      errKeys,
    );
    expect(reg.status).toBe(422);
    const dup = await api.call(
      'register duplicate',
      'POST',
      '/auth/register',
      {
        body: {
          name: 'Again',
          email: 'DEMO-BUYER@vanishingtrades.test',
          password: 'longenough',
          role: 'buyer',
        },
      },
      errKeys,
    );
    expect(dup.status).toBe(409);
    const ok = await api.call(
      'register artisan',
      'POST',
      '/auth/register',
      {
        body: {
          name: 'New Potter',
          email: 'new.potter@example.com',
          password: 'longenough',
          role: 'artisan',
        },
      },
      (b) => b.data.user.role,
    );
    expect(ok.status).toBe(201);
    const prof = await api.call(
      'new artisan profile exists',
      'GET',
      '/artisans/me',
      { token: ok.body.data.token },
      (b) => b.data.name,
    );
    expect(prof.status).toBe(200);
    const upd = await api.call(
      'update me',
      'PATCH',
      '/auth/me',
      { token: ok.body.data.token, body: { preferredLang: 'kn' } },
      (b) => b.data.preferredLang,
    );
    expect(upd.body.data.preferredLang).toBe('kn');
    const bogus = await api.call(
      'bogus token',
      'GET',
      '/auth/me',
      { token: 'not-a-real-token' },
      msg,
    );
    expect(bogus.status).toBe(401);

    // Logging out revokes the token used and every other token of that account.
    const creds = { email: 'demo-learner@vanishingtrades.test', password: 'demo1234' };
    const t1 = (await api.call('learner login A', 'POST', '/auth/login', { body: creds })).body.data
      .token;
    const t2 = (await api.call('learner login B', 'POST', '/auth/login', { body: creds })).body.data
      .token;
    expect((await api.call('logout A', 'POST', '/auth/logout', { token: t1 })).status).toBe(200);
    expect(
      (await api.call('token A after logout', 'GET', '/auth/me', { token: t1 }, msg)).status,
    ).toBe(401);
    expect(
      (await api.call('token B after logout', 'GET', '/auth/me', { token: t2 }, msg)).status,
    ).toBe(401);
    expect(
      (await api.call('logout again with A', 'POST', '/auth/logout', { token: t1 }, msg)).status,
    ).toBe(401);
    const fresh = (await api.call('learner signs in again', 'POST', '/auth/login', { body: creds }))
      .body.data.token;
    expect((await api.call('new token works', 'GET', '/auth/me', { token: fresh })).status).toBe(
      200,
    );
  },

  async '401 and 403 on every role-locked endpoint'(api) {
    const LOCKED = [
      ['GET', '/auth/me', ROLES],
      ['PATCH', '/auth/me', ROLES],
      ['GET', '/artisans/me', ['artisan']],
      ['PUT', '/artisans/me', ['artisan']],
      ['GET', '/crafts/mine', ['artisan']],
      ['POST', '/crafts', ['artisan']],
      ['PUT', `/crafts/${C(1)}`, ['artisan']],
      ['DELETE', `/crafts/${C(1)}`, ['artisan', 'admin']],
      ['POST', '/enquiries', ['buyer']],
      ['GET', '/enquiries', ['buyer', 'artisan', 'admin']],
      ['GET', '/stories/mine', ['artisan']],
      ['POST', '/stories', ['artisan']],
      ['PUT', `/stories/${S(13)}`, ['artisan']],
      ['POST', `/stories/${S(13)}/audio`, ['artisan']],
      ['POST', `/stories/${S(13)}/submit`, ['artisan']],
      ['DELETE', `/stories/${S(13)}`, ['artisan', 'admin']],
      ['POST', `/ai/stories/${S(13)}/process`, ['artisan']],
      ['GET', '/review/queue', ['reviewer', 'admin']],
      ['GET', `/review/${S(6)}`, ['reviewer', 'admin']],
      ['POST', `/review/${S(6)}/approve`, ['reviewer', 'admin']],
      ['POST', `/review/${S(6)}/reject`, ['reviewer', 'admin']],
      ['GET', '/apprenticeships/mine', ['artisan']],
      ['POST', '/apprenticeships', ['artisan']],
      ['PUT', `/apprenticeships/${P(1)}`, ['artisan']],
      ['DELETE', `/apprenticeships/${P(1)}`, ['artisan', 'admin']],
      ['GET', `/apprenticeships/${P(1)}/applications`, ['artisan', 'admin']],
      ['POST', '/applications', ['learner']],
      ['GET', '/applications/mine', ['learner']],
      ['PATCH', `/applications/${AP(3)}/status`, ['artisan']],
      ['POST', `/applications/${AP(2)}/complete`, ['artisan']],
      ['PATCH', `/applications/${AP(2)}/roadmap/s3`, ['learner']],
      ['GET', `/applications/${AP(2)}/progress`, ['learner', 'artisan']],
      ['POST', `/applications/${AP(2)}/progress`, ['learner']],
      ['GET', '/impact/dashboard', ['admin']],
      ['POST', '/flags', ROLES],
      ['GET', '/admin/users', ['admin']],
      ['PATCH', `/admin/users/${U(3)}/role`, ['admin']],
      ['PATCH', `/admin/users/${U(3)}/active`, ['admin']],
      ['GET', '/admin/flags', ['admin']],
      ['POST', `/admin/flags/${F(1)}/resolve`, ['admin']],
      ['GET', '/admin/audit', ['admin']],
      ['POST', '/uploads/image', ROLES],
    ];
    for (const [method, path, allowed] of LOCKED) {
      const anon = await api.call(`${method} ${path} anon`, method, path, { body: {} }, msg);
      expect(anon.status, `${method} ${path} without a token`).toBe(401);
      for (const role of ROLES.filter((r) => !allowed.includes(r))) {
        const res = await api.call(
          `${method} ${path} as ${role}`,
          method,
          path,
          {
            token: await api.login(role),
            body: {},
          },
          msg,
        );
        expect(res.status, `${method} ${path} as ${role}`).toBe(403);
      }
    }
  },

  async 'gallery pagination, filters, sort and search'(api) {
    const cases = [
      {},
      { limit: '5', page: '2' },
      { limit: '500' },
      { page: '99' },
      { craftType: 'ilkal' },
      { district: 'Bidar' },
      { minPrice: '5000', maxPrice: '10000' },
      { sort: 'price-asc', limit: '6' },
      { sort: 'price-desc', limit: '6' },
      { sort: 'title', limit: '6' },
      { sort: 'oldest', limit: '4' },
      { q: 'silver vine' },
      { q: 'KEMPAMMA horse' },
      { q: 'ಗೊಂಬೆ' },
      { q: 'clay', sort: 'price-asc' },
      { q: 'zzz-nothing' },
    ];
    for (const query of cases) {
      const r = await api.call(
        `crafts ${JSON.stringify(query)}`,
        'GET',
        '/crafts',
        { query },
        (b) => ({
          pagination: page(b),
          titles: titles(b),
        }),
      );
      expect(r.status).toBe(200);
    }
    const p2 = await api.call(
      'page 2 of 5',
      'GET',
      '/crafts',
      { query: { limit: '5', page: '2' } },
      page,
    );
    expect(p2.body.data.pagination).toEqual({ page: 2, limit: 5, total: 24, totalPages: 5 });
    for (const query of [
      {},
      { sort: 'experience' },
      { sort: 'newest' },
      { q: 'kinhal' },
      { craftType: 'pottery' },
    ])
      await api.call(`artisans ${JSON.stringify(query)}`, 'GET', '/artisans', { query }, (b) => ({
        p: page(b),
        n: titles(b),
      }));
    await api.call('featured', 'GET', '/artisans/featured', {}, (b) => b.data.map((a) => a.name));
    await api.call('artisan profile', 'GET', `/artisans/${A(3)}`, {}, (b) => ({
      crafts: b.data.crafts.length,
      stories: b.data.stories.length,
      appr: b.data.apprenticeships.length,
      email: 'email' in b.data,
    }));
    await api.call('craft types', 'GET', '/craft-types', {}, (b) =>
      b.data.map((c) => [c.key, c.isSample]),
    );
    for (const query of [
      {},
      { sort: 'most-played' },
      { sort: 'oldest' },
      { language: 'hi' },
      { craftType: 'kinhal' },
      { q: 'ಮಣ್ಣು' },
      { q: 'grandfather lac' },
    ])
      await api.call(`archive ${JSON.stringify(query)}`, 'GET', '/archive', { query }, (b) => ({
        p: page(b),
        t: titles(b),
      }));
    await api.call('facets', 'GET', '/archive/facets', {}, (b) => b.data);
    for (const query of [
      {},
      { status: 'all' },
      { status: 'closed' },
      { sort: 'newest' },
      { q: 'loom' },
    ])
      await api.call(
        `apprenticeships ${JSON.stringify(query)}`,
        'GET',
        '/apprenticeships',
        { query },
        (b) => ({ p: page(b), t: titles(b) }),
      );
    const missing = await api.call('missing craft', 'GET', '/crafts/not-an-id', {}, msg);
    expect(missing.status).toBe(404);
  },

  async 'craft CRUD with ownership'(api) {
    const me = await api.login('artisan');
    const bad = await api.call(
      'invalid craft',
      'POST',
      '/crafts',
      {
        token: me,
        body: {
          title: { en: 'ab' },
          craftType: 'lego',
          description: { en: 'short' },
          priceMin: 9,
          priceMax: 2,
        },
      },
      (b) => b.errors,
    );
    expect(bad.status).toBe(422);
    const made = await api.call(
      'create craft',
      'POST',
      '/crafts',
      {
        token: me,
        body: {
          title: { en: 'Elephant on wheels', kn: 'ಚಕ್ರದ ಆನೆ' },
          craftType: 'channapatna',
          description: { en: 'A pull-along elephant in lac red and indigo.' },
          materials: ['aale wood', 'lac'],
          priceMin: 700,
          priceMax: 900,
        },
      },
      (b) => [b.data.title, b.data.artisan.name, b.data.materials],
    );
    expect(made.status).toBe(201);
    const id = made.body.data.id;
    await api.call('read craft', 'GET', `/crafts/${id}`, {}, (b) => b.data.priceMax);
    await api.call('my crafts', 'GET', '/crafts/mine', { token: me }, (b) => b.data.length);
    const upd = await api.call(
      'update own',
      'PUT',
      `/crafts/${id}`,
      { token: me, body: { priceMax: 950 } },
      (b) => b.data.priceMax,
    );
    expect(upd.status).toBe(200);
    const order = await api.call(
      'price order',
      'PUT',
      `/crafts/${id}`,
      { token: me, body: { priceMax: 100 } },
      (b) => b.errors,
    );
    expect(order.status).toBe(422);
    const other = await api.call(
      'update other artisan craft',
      'PUT',
      `/crafts/${C(5)}`,
      { token: me, body: { priceMax: 1 } },
      msg,
    );
    expect(other.status).toBe(403);
    const delOther = await api.call(
      'delete other artisan craft',
      'DELETE',
      `/crafts/${C(5)}`,
      { token: me },
      msg,
    );
    expect(delOther.status).toBe(403);
    const del = await api.call('delete own', 'DELETE', `/crafts/${id}`, { token: me }, (b) =>
      Boolean(b.data.id),
    );
    expect(del.status).toBe(200);
    const gone = await api.call('deleted craft', 'GET', `/crafts/${id}`, {}, msg);
    expect(gone.status).toBe(404);
    const take = await api.call(
      'admin takes down',
      'DELETE',
      `/crafts/${C(6)}`,
      { token: await api.login('admin') },
      (b) => b.data.id,
    );
    expect(take.status).toBe(200);
    await api.call(
      'audit after take-down',
      'GET',
      '/admin/audit',
      { token: await api.login('admin') },
      (b) => b.data.items.map((a) => a.action),
    );
    await api.call(
      'profile update',
      'PUT',
      '/artisans/me',
      { token: me, body: { yearsOfPractice: 35, bio: { en: 'Still turning.' } } },
      (b) => [b.data.yearsOfPractice, b.data.bio.en],
    );
  },

  async 'story pipeline from draft to the public archive'(api) {
    const me = await api.login('artisan');
    const rev = await api.login('reviewer');
    const made = await api.call(
      'create story',
      'POST',
      '/stories',
      {
        token: me,
        body: {
          title: 'The night of the kiln',
          language: 'kn',
          text: 'ನಾವು ಕೆರೆಯ ಮಣ್ಣು ತರುತ್ತೇವೆ. ರಾತ್ರಿ ಒಲೆ ಹಚ್ಚುತ್ತೇವೆ.',
        },
      },
      (b) => [b.data.status, b.data.craftType, b.data.ai],
    );
    expect(made.status).toBe(201);
    const id = made.body.data.id;
    const wrongType = await api.call(
      'audio wrong type',
      'POST',
      `/stories/${id}/audio`,
      { token: me, body: { durationSec: 12 }, files: { audio: NOT_AUDIO } },
      errKeys,
    );
    expect(wrongType.status).toBe(422);
    const noDur = await api.call(
      'audio without duration',
      'POST',
      `/stories/${id}/audio`,
      { token: me, body: {}, files: { audio: AUDIO } },
      errKeys,
    );
    expect(noDur.status).toBe(422);
    const audio = await api.call(
      'audio upload',
      'POST',
      `/stories/${id}/audio`,
      { token: me, body: { durationSec: 12 }, files: { audio: AUDIO } },
      (b) => [b.data.durationSec, b.data.audioIsSample, typeof b.data.audioUrl],
    );
    expect(audio.status).toBe(200);
    const ai = await api.call(
      'process with AI',
      'POST',
      `/ai/stories/${id}/process`,
      { token: me },
      (b) => ({
        transcript: b.data.transcript,
        translation: b.data.translation.map((s) => s.text),
        summary: b.data.summary,
        sample: b.data.ai.isSample,
        provider: b.data.ai.provider,
      }),
    );
    expect(ai.status).toBe(200);
    expect(ai.body.data.transcript[1].start).toBe(6);
    const tr = ai.body.data.transcript;
    const badEdit = await api.call(
      'invalid edit',
      'PUT',
      `/stories/${id}`,
      { token: me, body: { title: 'ab', transcript: [{ text: '' }] } },
      (b) => b.errors,
    );
    expect(badEdit.status).toBe(422);
    const edit = await api.call(
      'edit transcript',
      'PUT',
      `/stories/${id}`,
      {
        token: me,
        body: {
          transcript: [{ ...tr[0], text: 'ನಾವು ಕೆರೆಯ ತಳದ ಮಣ್ಣು ತರುತ್ತೇವೆ.' }, tr[1]],
          tags: ['kiln', 'clay'],
        },
      },
      (b) => [b.data.transcript, b.data.tags],
    );
    expect(edit.status).toBe(200);
    const sub = await api.call(
      'submit',
      'POST',
      `/stories/${id}/submit`,
      { token: me },
      (b) => b.data.status,
    );
    expect(sub.body.data.status).toBe('pending');
    expect(
      (await api.call('submit twice', 'POST', `/stories/${id}/submit`, { token: me }, msg)).status,
    ).toBe(409);
    expect(
      (
        await api.call(
          'edit while pending',
          'PUT',
          `/stories/${id}`,
          { token: me, body: { tags: [] } },
          msg,
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await api.call(
          'learner cannot read a draft',
          'GET',
          `/stories/${id}`,
          { token: await api.login('learner') },
          msg,
        )
      ).status,
    ).toBe(404);
    await api.call('queue', 'GET', '/review/queue', { token: rev }, (b) => ({
      p: page(b),
      t: titles(b),
    }));
    expect(
      (
        await api.call(
          'reject without note',
          'POST',
          `/review/${id}/reject`,
          { token: rev, body: { note: 'x' } },
          errKeys,
        )
      ).status,
    ).toBe(422);
    const rej = await api.call(
      'reject',
      'POST',
      `/review/${id}/reject`,
      { token: rev, body: { note: 'Please say which lake the clay comes from.' } },
      (b) => [b.data.status, b.data.reviewNote],
    );
    expect(rej.body.data.status).toBe('rejected');
    expect(
      (
        await api.call(
          'approve a rejected story',
          'POST',
          `/review/${id}/approve`,
          { token: rev, body: {} },
          msg,
        )
      ).status,
    ).toBe(409);
    await api.call(
      'artisan sees note',
      'GET',
      `/stories/${id}`,
      { token: me },
      (b) => b.data.reviewNote,
    );
    await api.call(
      'edit after rejection',
      'PUT',
      `/stories/${id}`,
      { token: me, body: { summary: { en: 'Clay from the Kollegal lake, fired at night.' } } },
      (b) => b.data.summary,
    );
    const re = await api.call('resubmit', 'POST', `/stories/${id}/submit`, { token: me }, (b) => [
      b.data.status,
      b.data.reviewNote,
    ]);
    expect(re.body.data.status).toBe('pending');
    const appr = await api.call(
      'approve with edits',
      'POST',
      `/review/${id}/approve`,
      {
        token: rev,
        body: { edits: { title: 'The night of the kiln, Kollegal' }, note: 'Thank you.' },
      },
      (b) => [b.data.status, b.data.title, b.data.reviewNote],
    );
    expect(appr.body.data.status).toBe('approved');
    const found = await api.call(
      'find in archive',
      'GET',
      '/archive',
      { query: { q: 'kollegal kiln' } },
      (b) => ({ p: page(b), t: titles(b), keys: Object.keys(b.data.items[0] || {}).sort() }),
    );
    expect(found.body.data.items.map((i) => i.id)).toContain(id);
    const detail = await api.call('archive detail', 'GET', `/archive/${id}`, {}, (b) => [
      'reviewNote' in b.data,
      b.data.transcript.length,
    ]);
    expect(detail.status).toBe(200);
    await api.call('play', 'POST', `/archive/${id}/play`, {}, (b) => b.data.plays);
    await api.call('play again', 'POST', `/archive/${id}/play`, {}, (b) => b.data.plays);
    expect(
      (await api.call('draft not in archive', 'GET', `/archive/${S(13)}`, {}, msg)).status,
    ).toBe(404);
    expect(
      (await api.call('delete approved story', 'DELETE', `/stories/${id}`, { token: me }, msg))
        .status,
    ).toBe(409);
    expect(
      (
        await api.call('process with nothing', 'POST', '/stories', {
          token: me,
          body: { title: 'Empty one', language: 'en' },
        })
      ).status,
    ).toBe(201);
    const empty = (
      await api.call('mine', 'GET', '/stories/mine', { token: me }, (b) =>
        b.data.map((s) => s.status),
      )
    ).body.data[0];
    expect(
      (
        await api.call(
          'AI needs audio or text',
          'POST',
          `/ai/stories/${empty.id}/process`,
          { token: me },
          (b) => b.errors,
        )
      ).status,
    ).toBe(422);
    expect(
      (
        await api.call(
          'submit needs text',
          'POST',
          `/stories/${empty.id}/submit`,
          { token: me },
          (b) => b.errors,
        )
      ).status,
    ).toBe(422);
    expect(
      (await api.call('delete draft', 'DELETE', `/stories/${empty.id}`, { token: me })).status,
    ).toBe(200);
    expect(
      (
        await api.call(
          'admin takes story down',
          'DELETE',
          `/stories/${S(9)}`,
          { token: await api.login('admin') },
          (b) => b.data.id,
        )
      ).status,
    ).toBe(200);
  },

  async 'enquiries are for participants only'(api) {
    const buyer = await api.login('buyer');
    const artisan = await api.login('artisan');
    const wrongPiece = await api.call(
      'craft of another artisan',
      'POST',
      '/enquiries',
      {
        token: buyer,
        body: {
          artisanId: A(1),
          craftId: C(5),
          subject: 'Mixed up',
          message: 'This is not your piece at all.',
        },
      },
      (b) => b.errors,
    );
    expect(wrongPiece.status).toBe(422);
    expect(
      (
        await api.call(
          'unknown artisan',
          'POST',
          '/enquiries',
          {
            token: buyer,
            body: { artisanId: A(99), subject: 'Hello', message: 'Anybody at this workshop?' },
          },
          msg,
        )
      ).status,
    ).toBe(404);
    const made = await api.call(
      'send enquiry',
      'POST',
      '/enquiries',
      {
        token: buyer,
        body: {
          artisanId: A(1),
          craftId: C(1),
          subject: 'Horses for a library',
          message: 'Could you make ten small rocking horses for us?',
        },
      },
      (b) => [b.data.status, b.data.craft.title, b.data.buyer.name, 'email' in b.data.buyer],
    );
    expect(made.status).toBe(201);
    const id = made.body.data.id;
    await api.call('buyer list', 'GET', '/enquiries', { token: buyer }, (b) => ({
      p: page(b),
      s: b.data.items.map((e) => e.subject),
    }));
    await api.call('artisan inbox', 'GET', '/enquiries', { token: artisan }, (b) => ({
      p: page(b),
      s: b.data.items.map((e) => e.subject),
    }));
    await api.call(
      'admin sees all',
      'GET',
      '/enquiries',
      { token: await api.login('admin'), query: { limit: '50' } },
      page,
    );
    expect(
      (
        await api.call(
          'reviewer cannot read',
          'GET',
          `/enquiries/${id}`,
          { token: await api.login('reviewer') },
          msg,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await api.call(
          'learner cannot read',
          'GET',
          `/enquiries/${id}`,
          { token: await api.login('learner') },
          msg,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await api.call('admin can read', 'GET', `/enquiries/${id}`, {
          token: await api.login('admin'),
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await api.call(
          'admin cannot reply',
          'POST',
          `/enquiries/${id}/replies`,
          { token: await api.login('admin'), body: { message: 'Hi' } },
          msg,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await api.call(
          'artisan of another enquiry',
          'GET',
          `/enquiries/${E(3)}`,
          { token: artisan },
          msg,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await api.call(
          'non-participant closes',
          'PATCH',
          `/enquiries/${E(3)}/status`,
          { token: artisan, body: { status: 'closed' } },
          msg,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await api.call(
          'non-participant replies',
          'POST',
          `/enquiries/${E(3)}/replies`,
          { token: artisan, body: { message: 'Not my letter' } },
          msg,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await api.call(
          'learner closes',
          'PATCH',
          `/enquiries/${id}/status`,
          { token: await api.login('learner'), body: { status: 'closed' } },
          msg,
        )
      ).status,
    ).toBe(404);
    const rep = await api.call(
      'artisan replies',
      'POST',
      `/enquiries/${id}/replies`,
      { token: artisan, body: { message: 'Yes, in five weeks.' } },
      (b) => [b.data.status, b.data.replies.map((r) => [r.authorRole, r.message])],
    );
    expect(rep.body.data.status).toBe('answered');
    const back = await api.call(
      'buyer replies',
      'POST',
      `/enquiries/${id}/replies`,
      { token: buyer, body: { message: 'Lovely, thank you.' } },
      (b) => b.data.status,
    );
    expect(back.body.data.status).toBe('open');
    await api.call(
      'buyer closes',
      'PATCH',
      `/enquiries/${id}/status`,
      { token: buyer, body: { status: 'closed' } },
      (b) => b.data.status,
    );
    expect(
      (
        await api.call(
          'reply to closed',
          'POST',
          `/enquiries/${id}/replies`,
          { token: artisan, body: { message: 'One more thing' } },
          msg,
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await api.call(
          'bad status',
          'PATCH',
          `/enquiries/${id}/status`,
          { token: artisan, body: { status: 'answered' } },
          errKeys,
        )
      ).status,
    ).toBe(422);
    await api.call(
      'artisan reopens',
      'PATCH',
      `/enquiries/${id}/status`,
      { token: artisan, body: { status: 'open' } },
      (b) => b.data.status,
    );
    await api.call(
      'seeded thread',
      'GET',
      `/enquiries/${E(1)}`,
      { token: buyer },
      (b) => b.data.replies.length,
    );
  },

  async 'apprenticeship apply, accept, complete and verify'(api) {
    const learner = await api.login('learner');
    const artisan = await api.login('artisan');
    expect(
      (
        await api.call(
          'apply closed',
          'POST',
          '/applications',
          {
            token: learner,
            body: {
              apprenticeshipId: P(6),
              motivation: 'I would love to learn the wheel and kiln.',
            },
          },
          msg,
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await api.call(
          'apply unknown',
          'POST',
          '/applications',
          {
            token: learner,
            body: {
              apprenticeshipId: P(99),
              motivation: 'I would love to learn the wheel and kiln.',
            },
          },
          msg,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await api.call(
          'apply short motivation',
          'POST',
          '/applications',
          { token: learner, body: { apprenticeshipId: P(1), motivation: 'pls' } },
          errKeys,
        )
      ).status,
    ).toBe(422);
    expect(
      (
        await api.call(
          'apply twice (already completed one)',
          'POST',
          '/applications',
          {
            token: learner,
            body: { apprenticeshipId: P(1), motivation: 'Again, because I enjoyed it so much.' },
          },
          msg,
        )
      ).status,
    ).toBe(409);
    const opening = await api.call(
      'artisan posts opening',
      'POST',
      '/apprenticeships',
      {
        token: artisan,
        body: {
          title: 'Lac colours, four weeks',
          craftType: 'channapatna',
          description: 'Mix lac with turmeric, kumkum and indigo and press it onto turning wood.',
          seats: 1,
          durationWeeks: 4,
          stipend: null,
          location: 'Kalanagara',
          deadline: future(20),
        },
      },
      (b) => [b.data.status, b.data.applicationsCount, b.data.stipend],
    );
    expect(opening.status).toBe(201);
    expect(
      (
        await api.call(
          'deadline in the past',
          'POST',
          '/apprenticeships',
          {
            token: artisan,
            body: { ...opening.body.data, deadline: future(-2), artisan: undefined },
          },
          errKeys,
        )
      ).status,
    ).toBe(422);
    const pid = opening.body.data.id;
    const applied = await api.call(
      'learner applies',
      'POST',
      '/applications',
      {
        token: learner,
        body: {
          apprenticeshipId: pid,
          motivation: 'I paint at home and want to learn lac colours properly.',
        },
      },
      (b) => [b.data.status, b.data.roadmap, b.data.apprenticeship.artisanName],
    );
    expect(applied.status).toBe(201);
    const aid = applied.body.data.id;
    expect(
      (
        await api.call(
          'roadmap before acceptance',
          'PATCH',
          `/applications/${aid}/roadmap/s1`,
          { token: learner, body: { done: true } },
          msg,
        )
      ).status,
    ).toBe(409);
    await api.call(
      'applicants',
      'GET',
      `/apprenticeships/${pid}/applications`,
      { token: artisan },
      (b) => b.data.map((a) => [a.learner.name, 'email' in a.learner]),
    );
    expect(
      (
        await api.call(
          'complete before acceptance',
          'POST',
          `/applications/${aid}/complete`,
          { token: artisan },
          msg,
        )
      ).status,
    ).toBe(409);
    await api.call(
      'shortlist',
      'PATCH',
      `/applications/${aid}/status`,
      { token: artisan, body: { status: 'shortlisted' } },
      (b) => b.data.status,
    );
    await api.call(
      'accept',
      'PATCH',
      `/applications/${aid}/status`,
      { token: artisan, body: { status: 'accepted' } },
      (b) => b.data.status,
    );
    expect(
      (
        await api.call(
          'accepted cannot go back',
          'PATCH',
          `/applications/${aid}/status`,
          { token: artisan, body: { status: 'shortlisted' } },
          msg,
        )
      ).status,
    ).toBe(409);
    await api.call(
      'step done',
      'PATCH',
      `/applications/${aid}/roadmap/s1`,
      { token: learner, body: { done: true } },
      (b) => b.data.roadmap.map((s) => s.done),
    );
    expect(
      (
        await api.call(
          'unknown step',
          'PATCH',
          `/applications/${aid}/roadmap/s9`,
          { token: learner, body: { done: true } },
          msg,
        )
      ).status,
    ).toBe(404);
    await api.call(
      'progress entry',
      'POST',
      `/applications/${aid}/progress`,
      { token: learner, body: { note: 'Mixed my first turmeric lac stick.' } },
      (b) => b.data.note,
    );
    await api.call(
      'progress list (artisan)',
      'GET',
      `/applications/${aid}/progress`,
      { token: artisan },
      (b) => b.data.map((p) => p.note),
    );
    expect(
      (
        await api.call(
          'other artisan cannot see progress',
          'GET',
          `/applications/${AP(2)}/progress`,
          { token: artisan },
          msg,
        )
      ).status,
    ).toBe(404);
    const done = await api.call(
      'complete',
      'POST',
      `/applications/${aid}/complete`,
      { token: artisan },
      (b) => [
        b.data.application.status,
        b.data.certificate.learnerName,
        b.data.certificate.durationWeeks,
      ],
    );
    expect(done.status).toBe(200);
    const code = done.body.data.certificate.code;
    expect(code).toMatch(CERT_RE);
    await api.call(
      'verify new certificate',
      'GET',
      `/certificates/${code.toLowerCase()}`,
      {},
      (b) => [b.data.learnerName, b.data.artisanName, b.data.apprenticeshipTitle],
    );
    await api.call(
      'verify seeded certificate',
      'GET',
      `/certificates/${SEED_CERT_CODE}`,
      {},
      (b) => {
        const { issuedAt: _i, ...c } = b.data;
        return c;
      },
    );
    expect(
      (await api.call('verify unknown', 'GET', '/certificates/VT-AAAA-BBBB', {}, msg)).status,
    ).toBe(404);
    await api.call('my applications', 'GET', '/applications/mine', { token: learner }, (b) =>
      b.data.map((a) => a.status),
    );
    expect(
      (
        await api.call(
          'other artisan application',
          'PATCH',
          `/applications/${AP(5)}/status`,
          { token: artisan, body: { status: 'accepted' } },
          msg,
        )
      ).status,
    ).toBe(404);
    await api.call(
      'edit opening',
      'PUT',
      `/apprenticeships/${pid}`,
      { token: artisan, body: { status: 'closed' } },
      (b) => b.data.status,
    );
    expect(
      (
        await api.call(
          'edit other opening',
          'PUT',
          `/apprenticeships/${P(2)}`,
          { token: artisan, body: { status: 'closed' } },
          msg,
        )
      ).status,
    ).toBe(403);
    expect(
      (await api.call('delete opening', 'DELETE', `/apprenticeships/${pid}`, { token: artisan }))
        .status,
    ).toBe(200);
  },

  async 'impact totals and dashboard'(api) {
    await api.call('impact (seed)', 'GET', '/impact', {}, (b) => {
      const { generatedAt: _g, ...rest } = b.data;
      return rest;
    });
    await api.call(
      'dashboard',
      'GET',
      '/impact/dashboard',
      { token: await api.login('admin') },
      (b) => ({
        totals: b.data.totals,
        isSample: b.data.isSample,
        months: b.data.series.sdg8.map((m) => m.month),
        series: b.data.series,
        breakdowns: b.data.breakdowns,
      }),
    );
    await api.call(
      'register a real buyer',
      'POST',
      '/auth/register',
      {
        body: {
          name: 'Real Person',
          email: 'real@example.com',
          password: 'longenough',
          role: 'buyer',
        },
      },
      (b) => b.data.user.role,
    );
    const after = await api.call(
      'impact (real data)',
      'GET',
      '/impact',
      {},
      (b) => b.data.isSample,
    );
    expect(after.body.data.isSample).toBe(false);
  },

  async 'admin user, flag and audit actions'(api) {
    const admin = await api.login('admin');
    await api.call(
      'users',
      'GET',
      '/admin/users',
      { token: admin, query: { limit: '50' } },
      (b) => ({ p: page(b), n: b.data.items.map((u) => u.name) }),
    );
    await api.call(
      'users filtered',
      'GET',
      '/admin/users',
      { token: admin, query: { q: 'demo vanishingtrades', role: 'buyer' } },
      (b) => b.data.items.map((u) => u.email),
    );
    expect(
      (
        await api.call(
          'own role',
          'PATCH',
          `/admin/users/${U(5)}/role`,
          { token: admin, body: { role: 'buyer' } },
          msg,
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await api.call(
          'bad role',
          'PATCH',
          `/admin/users/${U(17)}/role`,
          { token: admin, body: { role: 'king' } },
          errKeys,
        )
      ).status,
    ).toBe(422);
    const role = await api.call(
      'make Arjun an artisan',
      'PATCH',
      `/admin/users/${U(17)}/role`,
      { token: admin, body: { role: 'artisan' } },
      (b) => b.data.role,
    );
    expect(role.body.data.role).toBe('artisan');
    const buyerToken = await api.login('buyer');
    const paused = await api.call(
      'pause buyer',
      'PATCH',
      `/admin/users/${U(3)}/active`,
      { token: admin, body: { active: false } },
      (b) => b.data.active,
    );
    expect(paused.body.data.active).toBe(false);
    const rejected = await api.call(
      'paused buyer next request',
      'GET',
      '/enquiries',
      { token: buyerToken },
      (b) => [b.code, b.message],
    );
    expect(rejected.status).toBe(403);
    expect(rejected.body.code).toBe('ACCOUNT_PAUSED');
    expect(
      (
        await api.call(
          'paused buyer login',
          'POST',
          '/auth/login',
          { body: { email: 'demo-buyer@vanishingtrades.test', password: 'demo1234' } },
          (b) => b.code,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await api.call(
          'pause self',
          'PATCH',
          `/admin/users/${U(5)}/active`,
          { token: admin, body: { active: false } },
          msg,
        )
      ).status,
    ).toBe(409);
    await api.call(
      'reactivate buyer',
      'PATCH',
      `/admin/users/${U(3)}/active`,
      { token: admin, body: { active: true } },
      (b) => b.data.active,
    );
    expect((await api.call('buyer is back', 'GET', '/auth/me', { token: buyerToken })).status).toBe(
      200,
    );
    await api.call('open flags', 'GET', '/admin/flags', { token: admin }, (b) => ({
      p: page(b),
      f: b.data.items.map((f) => [f.targetType, f.targetLabel, f.reporter.name]),
    }));
    const removed = await api.call(
      'remove flagged craft',
      'POST',
      `/admin/flags/${F(2)}/resolve`,
      { token: admin, body: { action: 'remove' } },
      (b) => [b.data.status, b.data.resolution, b.data.targetLabel],
    );
    expect(removed.status).toBe(200);
    expect(
      (await api.call('flagged craft is gone', 'GET', `/crafts/${C(23)}`, {}, msg)).status,
    ).toBe(404);
    expect(
      (
        await api.call(
          'resolve twice',
          'POST',
          `/admin/flags/${F(2)}/resolve`,
          { token: admin, body: { action: 'dismiss' } },
          msg,
        )
      ).status,
    ).toBe(409);
    await api.call(
      'dismiss flag',
      'POST',
      `/admin/flags/${F(1)}/resolve`,
      { token: admin, body: { action: 'dismiss' } },
      (b) => b.data.resolution,
    );
    await api.call(
      'pause flagged artisan',
      'POST',
      `/admin/flags/${F(3)}/resolve`,
      { token: admin, body: { action: 'remove' } },
      (b) => b.data.resolution,
    );
    await api.call(
      'flags resolved',
      'GET',
      '/admin/flags',
      { token: admin, query: { status: 'resolved' } },
      page,
    );
    const report = await api.call(
      'learner reports a story',
      'POST',
      '/flags',
      {
        token: await api.login('learner'),
        body: { targetType: 'story', targetId: S(1), reason: 'The date in the story seems wrong.' },
      },
      (b) => [b.data.status, b.data.targetLabel],
    );
    expect(report.status).toBe(201);
    expect(
      (
        await api.call(
          'report unknown target',
          'POST',
          '/flags',
          {
            token: await api.login('learner'),
            body: { targetType: 'craft', targetId: C(99), reason: 'Does this even exist?' },
          },
          msg,
        )
      ).status,
    ).toBe(404);
    const audit = await api.call('audit log', 'GET', '/admin/audit', { token: admin }, (b) => ({
      p: page(b),
      a: b.data.items.map((x) => x.action).sort(),
    }));
    expect(audit.body.data.items.map((x) => x.action)).toEqual(
      expect.arrayContaining([
        'user.role',
        'user.pause',
        'user.reactivate',
        'flag.remove',
        'flag.dismiss',
      ]),
    );
  },
  async 'artisan verification from request to public badge'(api) {
    const pub = (b) => (b.data.artisan ?? b.data).verified;
    const mine = (b) => {
      const { submittedAt: _s, decidedAt: _d, ...v } = b.data.verification;
      return { verified: b.data.verified, ...v };
    };
    const row = (b) => ({
      name: b.data.artisan.name,
      status: b.data.status,
      reason: b.data.reason,
      by: b.data.decidedBy?.name ?? null,
    });
    const request = {
      idType: 'pehchan',
      idNumber: 'KA-TEST-2026-0042',
      note: 'Card issued in 2019.',
    };
    const nothingPrivate = (res) =>
      expect(JSON.stringify(res.body)).not.toMatch(/idNumber|verifyId|KA-TEST|SAMPLE-/);

    // Public pages only ever say verified: true/false.
    const before = await api.call('public, unverified', 'GET', `/artisans/${A(1)}`, {}, pub);
    expect(pub(before.body)).toBe(false);
    nothingPrivate(before);
    const seeded = await api.call('public, verified', 'GET', `/artisans/${A(3)}`, {}, pub);
    expect(pub(seeded.body)).toBe(true);
    nothingPrivate(seeded);
    const list = await api.call(
      'public list',
      'GET',
      '/artisans',
      { query: { limit: '50' } },
      (b) => b.data.items.filter((a) => a.verified).length,
    );
    expect(list.body.data.items.filter((a) => a.verified)).toHaveLength(9);
    nothingPrivate(list);

    // Who may ask.
    const artisan = await api.login('artisan');
    const buyer = await api.login('buyer');
    const admin = await api.login('admin');
    const post = (label, opts, pick) =>
      api.call(label, 'POST', '/artisans/me/verification', opts, pick);
    expect((await post('ask, signed out', { body: request }, msg)).status).toBe(401);
    expect((await post('ask, as buyer', { token: buyer, body: request }, msg)).status).toBe(403);
    expect((await post('ask, empty', { token: artisan, body: {} }, errKeys)).status).toBe(422);
    expect(
      (
        await post(
          'ask, bad values',
          { token: artisan, body: { idType: 'passport', idNumber: 'x' } },
          errKeys,
        )
      ).status,
    ).toBe(422);

    const start = await api.call(
      'my profile before',
      'GET',
      '/artisans/me',
      { token: artisan },
      mine,
    );
    expect(start.body.data.verification.status).toBe('none');
    const asked = await post('ask', { token: artisan, body: request }, mine);
    expect(asked.status).toBe(200);
    expect(asked.body.data.verification).toMatchObject({ status: 'pending', ...request });
    expect(asked.body.data.verified).toBe(false);
    expect((await post('ask twice', { token: artisan, body: request }, msg)).status).toBe(409);
    // Still not public while it waits.
    expect(pub((await api.call('public, pending', 'GET', `/artisans/${A(1)}`, {}, pub)).body)).toBe(
      false,
    );

    // The admin queue.
    const queue = (label, opts, pick) => api.call(label, 'GET', '/admin/verifications', opts, pick);
    expect((await queue('queue, signed out', {}, msg)).status).toBe(401);
    expect((await queue('queue, as artisan', { token: artisan }, msg)).status).toBe(403);
    const names = (b) => ({ p: page(b), n: b.data.items.map((i) => i.artisan.name) });
    const pending = await queue('queue', { token: admin }, names);
    expect(pending.body.data.items.map((i) => i.artisan.name)).toEqual([
      'Shivalingaiah',
      'Kempamma',
    ]);
    expect(pending.body.data.items[1]).toMatchObject({
      idNumber: request.idNumber,
      status: 'pending',
    });
    await queue('queue, all', { token: admin, query: { status: 'all', limit: '50' } }, (b) => ({
      p: page(b),
      s: b.data.items.map((i) => i.status),
    }));
    await queue('queue, rejected', { token: admin, query: { status: 'rejected' } }, (b) =>
      b.data.items.map((i) => row({ data: i })),
    );
    await queue('queue, unknown status', { token: admin, query: { status: 'nope' } }, names);

    // Deciding.
    const decide = (label, id, opts, pick) =>
      api.call(label, 'POST', `/admin/verifications/${id}/decide`, opts, pick);
    expect(
      (
        await decide(
          'decide, as artisan',
          A(1),
          { token: artisan, body: { action: 'approve' } },
          msg,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await decide(
          'decide, bad action',
          A(1),
          { token: admin, body: { action: 'maybe' } },
          errKeys,
        )
      ).status,
    ).toBe(422);
    expect(
      (
        await decide(
          'reject, no reason',
          A(1),
          { token: admin, body: { action: 'reject' } },
          errKeys,
        )
      ).status,
    ).toBe(422);
    expect(
      (await decide('decide, unknown', A(999), { token: admin, body: { action: 'approve' } }, msg))
        .status,
    ).toBe(404);
    expect(
      (
        await decide(
          'decide, not an id',
          'nope',
          { token: admin, body: { action: 'approve' } },
          msg,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await decide(
          'approve, already verified',
          A(3),
          { token: admin, body: { action: 'approve' } },
          msg,
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await decide(
          'approve, never asked',
          A(12),
          { token: admin, body: { action: 'approve' } },
          msg,
        )
      ).status,
    ).toBe(409);

    const ok = await decide('approve', A(1), { token: admin, body: { action: 'approve' } }, row);
    expect(ok.status).toBe(200);
    expect(row(ok.body)).toEqual({
      name: 'Kempamma',
      status: 'verified',
      reason: null,
      by: 'Raghav Kulkarni',
    });

    // The badge is now public, on the profile and on every piece in the gallery.
    const after = await api.call('public, after approval', 'GET', `/artisans/${A(1)}`, {}, pub);
    expect(pub(after.body)).toBe(true);
    nothingPrivate(after);
    const crafts = await api.call('gallery', 'GET', '/crafts', { query: { limit: '50' } }, (b) =>
      b.data.items.map((c) => c.artisan.verified),
    );
    expect(
      crafts.body.data.items.filter((c) => c.artisanId === A(1)).every((c) => c.artisan.verified),
    ).toBe(true);
    nothingPrivate(crafts);
    await api.call('my profile, verified', 'GET', '/artisans/me', { token: artisan }, mine);
    expect((await post('ask when verified', { token: artisan, body: request }, msg)).status).toBe(
      409,
    );
    // Editing the profile keeps the private part in the owner's view.
    await api.call(
      'edit profile',
      'PUT',
      '/artisans/me',
      { token: artisan, body: { village: 'Kalanagara' } },
      mine,
    );

    // An admin can take the badge away again, with a reason the artisan sees.
    const reason = 'The card belongs to someone else.';
    const revoked = await decide(
      'revoke',
      A(1),
      { token: admin, body: { action: 'reject', reason } },
      row,
    );
    expect(row(revoked.body)).toMatchObject({ status: 'rejected', reason });
    expect(pub((await api.call('public, revoked', 'GET', `/artisans/${A(1)}`, {}, pub)).body)).toBe(
      false,
    );
    const told = await api.call(
      'my profile, rejected',
      'GET',
      '/artisans/me',
      { token: artisan },
      mine,
    );
    expect(told.body.data.verification.reason).toBe(reason);
    expect(
      (
        await decide(
          'reject twice',
          A(1),
          { token: admin, body: { action: 'reject', reason } },
          msg,
        )
      ).status,
    ).toBe(409);
    // A rejected artisan may ask again.
    const again = await post(
      'ask again',
      { token: artisan, body: { idType: 'cooperative', idNumber: 'COOP-7781' } },
      mine,
    );
    expect(again.body.data.verification).toMatchObject({
      status: 'pending',
      reason: null,
      note: null,
    });
    await decide(
      'reject a pending request',
      A(2),
      { token: admin, body: { action: 'reject', reason: 'Please send a clearer photo.' } },
      row,
    );

    const audit = await api.call(
      'audit',
      'GET',
      '/admin/audit',
      { token: admin, query: { limit: '50' } },
      (b) => b.data.items.map((x) => [x.action, x.details.name]),
    );
    expect(audit.body.data.items.map((x) => x.action)).toEqual(
      expect.arrayContaining(['artisan.verify', 'artisan.unverify', 'artisan.verify_reject']),
    );
  },
};

describe('contract parity: browser mock vs Express server', () => {
  const mock = mockDriver();
  let server;
  beforeAll(async () => {
    await startDb();
    server = serverDriver();
  });
  afterAll(stopDb);

  for (const [name, scenario] of Object.entries(scenarios)) {
    it(name, async () => {
      await mock.reset();
      await server.reset();
      const m = recorder(mock);
      const s = recorder(server);
      await scenario(m);
      await scenario(s);
      expect(m.log.length).toBeGreaterThan(0);
      // Compare entry by entry so a mismatch names the step.
      for (let i = 0; i < Math.max(m.log.length, s.log.length); i++)
        expect(s.log[i], `step "${m.log[i]?.label}"`).toEqual(m.log[i]);
    });
  }
});
