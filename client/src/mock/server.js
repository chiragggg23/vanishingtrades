// The in-browser mock backend. It implements docs/API_CONTRACT.md and returns
// { status, body } exactly like the Express server, so the same parity tests run against both.
import {
  AUDIO_MAX_BYTES,
  AUDIO_TYPES,
  CRAFT_TYPES,
  IMAGE_MAX_BYTES,
  IMAGE_TYPES,
  ROADMAP_STEPS,
  ROLES,
  baseMime,
  demoEmail,
} from '../../../shared/constants.js';
import { schemas, validate, sanitize } from '../../../shared/validation.js';
import { cmp, matchesAllWords, pageParams, paginate } from '../../../shared/search.js';
import * as V from '../../../shared/views.js';
import {
  STORY_EDITABLE,
  canMoveApplication,
  certCode,
  newId,
  normaliseSegments,
  VERIFY_LISTS,
  VERIFY_MSG,
  verifyAuditAction,
  verifyDecision,
} from '../../../shared/rules.js';
import { mockProcess } from '../../../shared/mockAi.js';
import { impactDashboard, impactTotals, isSampleWorld } from '../../../shared/impact.js';
import { getDb, resetDb, save } from './db.js';

// ---- options -------------------------------------------------------------------------------------
const options = { latency: true, failRate: 0.04 };
export function setMockOptions(o) {
  Object.assign(options, o);
}

class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    Object.assign(this, extra);
  }
}
const fail = (status, message, extra) => {
  throw new HttpError(status, message, extra);
};
const now = () => new Date().toISOString();
const MSG = {
  auth: 'Please sign in.',
  role: 'Your account cannot do this.',
  owner: 'Only the owner can change this.',
  notFound: 'We could not find that.',
  invalid: 'Please check the highlighted fields.',
  paused: 'This account is paused. Contact the VanishingTrades team.',
};

function check(schema, body, partial = false) {
  const r = validate(schema, body, { partial });
  if (!r.ok) fail(422, MSG.invalid, { errors: r.errors });
  return r.value;
}

// ---- lookups & views ------------------------------------------------------------------------------
const byId = (list, id) => list.find((x) => x.id === id);
const usersById = (db) => Object.fromEntries(db.users.map((u) => [u.id, u]));
const counts = (db, a) => ({
  worksCount: db.crafts.filter((c) => c.artisanId === a.id).length,
  storiesCount: db.stories.filter((s) => s.artisanId === a.id && s.status === 'approved').length,
});
const artisanOut = (db, a) => V.artisanView(a, counts(db, a));
const artisanOwnerOut = (db, a) => V.artisanOwnerView(a, counts(db, a));
const craftOut = (db, c) => V.craftView(c, byId(db.artisans, c.artisanId));
const storyOut = (db, s) => V.storyView(s, byId(db.artisans, s.artisanId));
const archiveOut = (db, s) => V.archiveItem(s, byId(db.artisans, s.artisanId));
const enquiryOut = (db, e) =>
  V.enquiryView(e, {
    buyer: byId(db.users, e.buyerId),
    artisan: byId(db.artisans, e.artisanId),
    craft: e.craftId ? byId(db.crafts, e.craftId) : null,
    usersById: usersById(db),
  });
const apprOut = (db, p) =>
  V.apprenticeshipView(
    p,
    byId(db.artisans, p.artisanId),
    db.applications.filter((a) => a.apprenticeshipId === p.id).length,
  );
const appOut = (db, a) => {
  const p = byId(db.apprenticeships, a.apprenticeshipId);
  return V.applicationView(a, {
    apprenticeship: p,
    artisan: p ? byId(db.artisans, p.artisanId) : null,
    learner: byId(db.users, a.learnerId),
  });
};
const targetLabel = (db, f) => {
  if (f.targetType === 'story') return byId(db.stories, f.targetId)?.title ?? null;
  if (f.targetType === 'craft') return byId(db.crafts, f.targetId)?.title?.en ?? null;
  return byId(db.artisans, f.targetId)?.name ?? null;
};
const flagOut = (db, f) =>
  V.flagView(f, { reporter: byId(db.users, f.reporterId), targetLabel: targetLabel(db, f) });

/** Sort with comparators; ties break by id in the direction of the first comparator. */
const sortWith = (list, ...cmps) => {
  const dir = cmps[0]?.dir === -1 ? -1 : 1;
  return [...list].sort((a, b) => {
    for (const c of cmps) {
      const r = c(a, b);
      if (r) return r;
    }
    return dir * cmp(a.id, b.id);
  });
};
const tag = (fn, dir) => Object.assign(fn, { dir });
const asc = (f) => tag((a, b) => cmp(f(a), f(b)), 1);
const desc = (f) => tag((a, b) => cmp(f(b), f(a)), -1);
const numAsc = (f) => tag((a, b) => f(a) - f(b), 1);
const numDesc = (f) => tag((a, b) => f(b) - f(a), -1);
const pageOf = (list, query, map) => {
  const { page, limit, skip } = pageParams(query);
  return {
    items: list.slice(skip, skip + limit).map(map),
    pagination: paginate(page, limit, list.length),
  };
};

// ---- auth ----------------------------------------------------------------------------------------
function currentUser(db, ctx) {
  if (!ctx.token) return null;
  const uid = db.sessions[ctx.token];
  const user = uid && byId(db.users, uid);
  if (!user) fail(401, MSG.auth);
  if (!user.active) fail(403, MSG.paused, { code: 'ACCOUNT_PAUSED' });
  return user;
}
function needUser(db, ctx, ...roles) {
  const user = currentUser(db, ctx);
  if (!user) fail(401, MSG.auth);
  if (roles.length && !roles.includes(user.role)) fail(403, MSG.role);
  return user;
}
const myArtisan = (db, user) => db.artisans.find((a) => a.userId === user.id);
function ensureArtisanProfile(db, user) {
  if (myArtisan(db, user)) return;
  db.artisans.push({
    id: newId(),
    userId: user.id,
    name: user.name,
    craftType: 'pottery',
    village: '—',
    district: '—',
    bio: { en: '' },
    yearsOfPractice: 0,
    languages: [],
    avatarUrl: null,
    seed: `artisan-${user.id}`,
    featured: false,
    createdAt: now(),
    updatedAt: now(),
  });
}
const token = () => `mock.${newId()}${newId()}`;
function audit(db, actor, action, targetType, targetId, details = {}) {
  db.audit.push({
    id: newId(),
    actorId: actor.id,
    action,
    targetType,
    targetId,
    details,
    createdAt: now(),
  });
}

// ---- files ---------------------------------------------------------------------------------------
const isBlob = (f) => typeof Blob !== 'undefined' && f instanceof Blob;
function readAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
async function storeAudio(file) {
  if (!isBlob(file)) return `mock-upload:audio:${newId()}`;
  if (file.size < 1.5 * 1024 * 1024 && typeof FileReader !== 'undefined')
    return readAsDataUrl(file);
  return URL.createObjectURL(file);
}
async function storeImage(file) {
  if (!isBlob(file) || typeof createImageBitmap === 'undefined' || typeof document === 'undefined')
    return `mock-upload:image:${newId()}.jpg`;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 800 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

// ---- routes --------------------------------------------------------------------------------------
const routes = [];
const on = (method, pattern, handler) => {
  const keys = [];
  const re = new RegExp(
    '^' +
      pattern.replace(/:([a-zA-Z]+)/g, (_, k) => {
        keys.push(k);
        return '([^/]+)';
      }) +
      '/?$',
  );
  routes.push({ method, re, keys, handler });
};

// Auth --------------------------------------------------------------------------------------------
on('POST', '/auth/login', (db, ctx) => {
  const v = check(schemas.login, ctx.body);
  const user = db.users.find((u) => u.email === v.email);
  if (!user || user.password !== v.password) fail(401, 'Email or password is wrong.');
  if (!user.active) fail(403, MSG.paused, { code: 'ACCOUNT_PAUSED' });
  const t = token();
  db.sessions[t] = user.id;
  return [200, { token: t, user: V.userView(user) }];
});
on('POST', '/auth/register', (db, ctx) => {
  const v = check(schemas.register, ctx.body);
  if (db.users.some((u) => u.email === v.email))
    fail(409, 'That email is already registered. Try signing in.', {
      errors: { email: 'Already registered.' },
    });
  const user = {
    id: newId(),
    name: v.name,
    email: v.email,
    password: v.password,
    role: v.role,
    active: true,
    preferredLang: 'en',
    demo: false,
    createdAt: now(),
    updatedAt: now(),
  };
  db.users.push(user);
  if (user.role === 'artisan') ensureArtisanProfile(db, user);
  const t = token();
  db.sessions[t] = user.id;
  return [201, { token: t, user: V.userView(user) }];
});
on('GET', '/auth/me', (db, ctx) => [200, V.userView(needUser(db, ctx))]);
on('POST', '/auth/logout', (db, ctx) => {
  const user = needUser(db, ctx);
  // Like the server, logging out ends every session this user has.
  for (const [t, uid] of Object.entries(db.sessions)) if (uid === user.id) delete db.sessions[t];
  return [200, { ok: true }];
});
on('PATCH', '/auth/me', (db, ctx) => {
  const user = needUser(db, ctx);
  const v = check(schemas.updateMe, ctx.body, true);
  Object.assign(user, v, { updatedAt: now() });
  return [200, V.userView(user)];
});

// Artisans ----------------------------------------------------------------------------------------
on('GET', '/artisans', (db, { query }) => {
  let list = db.artisans.filter(
    (a) =>
      matchesAllWords(query.q, [a.name, a.village, a.district, a.bio?.en]) &&
      (!query.craftType || a.craftType === query.craftType) &&
      (!query.district || a.district === query.district),
  );
  if (query.sort === 'experience')
    list = sortWith(
      list,
      numDesc((a) => a.yearsOfPractice),
    );
  else if (query.sort === 'newest')
    list = sortWith(
      list,
      desc((a) => a.createdAt),
    );
  else
    list = sortWith(
      list,
      asc((a) => a.name),
    );
  return [200, pageOf(list, query, (a) => artisanOut(db, a))];
});
on('GET', '/artisans/featured', (db) => [
  200,
  sortWith(
    db.artisans.filter((a) => a.featured),
    asc((a) => a.name),
  )
    .slice(0, 6)
    .map((a) => artisanOut(db, a)),
]);
on('GET', '/artisans/me', (db, ctx) => {
  const user = needUser(db, ctx, 'artisan');
  ensureArtisanProfile(db, user);
  return [200, artisanOwnerOut(db, myArtisan(db, user))];
});
on('PUT', '/artisans/me', (db, ctx) => {
  const user = needUser(db, ctx, 'artisan');
  const v = check(schemas.artisan, ctx.body, true);
  ensureArtisanProfile(db, user);
  const a = myArtisan(db, user);
  Object.assign(a, v, { updatedAt: now() });
  return [200, artisanOwnerOut(db, a)];
});
on('POST', '/artisans/me/verification', (db, ctx) => {
  const user = needUser(db, ctx, 'artisan');
  const v = check(schemas.verificationRequest, ctx.body);
  ensureArtisanProfile(db, user);
  const a = myArtisan(db, user);
  const status = a.verifyStatus || 'none';
  if (status === 'pending') fail(409, VERIFY_MSG.pending);
  if (status === 'verified') fail(409, VERIFY_MSG.verified);
  Object.assign(a, {
    verifyStatus: 'pending',
    verifyIdType: v.idType,
    verifyIdNumber: v.idNumber,
    verifyNote: v.note ?? null,
    verifyReason: null,
    verifySubmittedAt: now(),
    verifyDecidedAt: null,
    verifyDecidedBy: null,
    updatedAt: now(),
  });
  return [200, artisanOwnerOut(db, a)];
});
on('GET', '/artisans/:id', (db, { params }) => {
  const a = byId(db.artisans, params.id) || fail(404, MSG.notFound);
  return [
    200,
    {
      ...artisanOut(db, a),
      crafts: sortWith(
        db.crafts.filter((c) => c.artisanId === a.id),
        desc((c) => c.createdAt),
      ).map((c) => craftOut(db, c)),
      stories: sortWith(
        db.stories.filter((s) => s.artisanId === a.id && s.status === 'approved'),
        desc((s) => s.approvedAt),
      ).map((s) => archiveOut(db, s)),
      apprenticeships: sortWith(
        db.apprenticeships.filter((p) => p.artisanId === a.id && p.status === 'open'),
        asc((p) => p.deadline),
      ).map((p) => apprOut(db, p)),
    },
  ];
});

// Crafts ------------------------------------------------------------------------------------------
on('GET', '/craft-types', () => [200, CRAFT_TYPES]);
on('GET', '/crafts', (db, { query }) => {
  const min = query.minPrice !== undefined && query.minPrice !== '' ? Number(query.minPrice) : null;
  const max = query.maxPrice !== undefined && query.maxPrice !== '' ? Number(query.maxPrice) : null;
  let list = db.crafts.filter((c) => {
    const a = byId(db.artisans, c.artisanId);
    return (
      matchesAllWords(query.q, [
        c.title.en,
        c.title.kn,
        c.title.hi,
        c.description.en,
        c.materials,
        a?.name,
      ]) &&
      (!query.craftType || c.craftType === query.craftType) &&
      (!query.district || a?.district === query.district) &&
      (min === null || Number.isNaN(min) || (c.priceMax !== null && c.priceMax >= min)) &&
      (max === null || Number.isNaN(max) || (c.priceMin !== null && c.priceMin <= max))
    );
  });
  const sorts = {
    oldest: [asc((c) => c.createdAt)],
    'price-asc': [numAsc((c) => c.priceMin ?? 1e12)],
    'price-desc': [numDesc((c) => c.priceMax ?? -1)],
    title: [asc((c) => c.title.en)],
  };
  list = sortWith(list, ...(sorts[query.sort] || [desc((c) => c.createdAt)]));
  return [200, pageOf(list, query, (c) => craftOut(db, c))];
});
on('GET', '/crafts/mine', (db, ctx) => {
  const user = needUser(db, ctx, 'artisan');
  const a = myArtisan(db, user);
  return [
    200,
    sortWith(
      db.crafts.filter((c) => c.artisanId === a?.id),
      desc((c) => c.createdAt),
    ).map((c) => craftOut(db, c)),
  ];
});
on('POST', '/crafts', (db, ctx) => {
  const user = needUser(db, ctx, 'artisan');
  const v = check(schemas.craft, ctx.body);
  ensureArtisanProfile(db, user);
  const a = myArtisan(db, user);
  const c = {
    id: newId(),
    artisanId: a.id,
    materials: [],
    priceMin: null,
    priceMax: null,
    imageUrl: null,
    ...v,
    seed: `work-${newId().slice(-6)}`,
    createdAt: now(),
    updatedAt: now(),
  };
  db.crafts.push(c);
  return [201, craftOut(db, c)];
});
on('GET', '/crafts/:id', (db, { params }) => [
  200,
  craftOut(db, byId(db.crafts, params.id) || fail(404, MSG.notFound)),
]);
on('PUT', '/crafts/:id', (db, ctx) => {
  const user = needUser(db, ctx, 'artisan');
  const v = check(schemas.craft, ctx.body, true);
  const c = byId(db.crafts, ctx.params.id) || fail(404, MSG.notFound);
  if (c.artisanId !== myArtisan(db, user)?.id) fail(403, MSG.owner);
  const merged = { ...c, ...v };
  if (
    typeof merged.priceMin === 'number' &&
    typeof merged.priceMax === 'number' &&
    merged.priceMax < merged.priceMin
  )
    fail(422, MSG.invalid, {
      errors: { priceMax: 'The highest price must be at least the lowest price.' },
    });
  Object.assign(c, v, { updatedAt: now() });
  return [200, craftOut(db, c)];
});
on('DELETE', '/crafts/:id', (db, ctx) => {
  const user = needUser(db, ctx, 'artisan', 'admin');
  const c = byId(db.crafts, ctx.params.id) || fail(404, MSG.notFound);
  if (user.role === 'artisan' && c.artisanId !== myArtisan(db, user)?.id) fail(403, MSG.owner);
  db.crafts = db.crafts.filter((x) => x.id !== c.id);
  if (user.role === 'admin') audit(db, user, 'craft.remove', 'craft', c.id, { title: c.title.en });
  return [200, { id: c.id }];
});

// Enquiries ---------------------------------------------------------------------------------------
const isParticipant = (db, user, e) =>
  e.buyerId === user.id || byId(db.artisans, e.artisanId)?.userId === user.id;
on('POST', '/enquiries', (db, ctx) => {
  const user = needUser(db, ctx, 'buyer');
  const v = check(schemas.enquiry, ctx.body);
  const a = byId(db.artisans, v.artisanId) || fail(404, MSG.notFound);
  if (v.craftId) {
    const c = byId(db.crafts, v.craftId);
    if (!c || c.artisanId !== a.id)
      fail(422, MSG.invalid, { errors: { craftId: 'This piece does not belong to the artisan.' } });
  }
  const e = {
    id: newId(),
    buyerId: user.id,
    artisanId: a.id,
    craftId: v.craftId || null,
    subject: v.subject,
    message: v.message,
    status: 'open',
    replies: [],
    createdAt: now(),
    updatedAt: now(),
  };
  db.enquiries.push(e);
  return [201, enquiryOut(db, e)];
});
on('GET', '/enquiries', (db, ctx) => {
  const user = needUser(db, ctx, 'buyer', 'artisan', 'admin');
  let list = db.enquiries;
  if (user.role === 'buyer') list = list.filter((e) => e.buyerId === user.id);
  if (user.role === 'artisan') list = list.filter((e) => e.artisanId === myArtisan(db, user)?.id);
  if (ctx.query.status) list = list.filter((e) => e.status === ctx.query.status);
  list = sortWith(
    list,
    desc((e) => e.updatedAt),
  );
  return [200, pageOf(list, ctx.query, (e) => enquiryOut(db, e))];
});
on('GET', '/enquiries/:id', (db, ctx) => {
  const user = needUser(db, ctx);
  const e = byId(db.enquiries, ctx.params.id);
  if (!e || (user.role !== 'admin' && !isParticipant(db, user, e))) fail(404, MSG.notFound);
  return [200, enquiryOut(db, e)];
});
on('POST', '/enquiries/:id/replies', (db, ctx) => {
  const user = needUser(db, ctx);
  const v = check(schemas.reply, ctx.body);
  const e = byId(db.enquiries, ctx.params.id);
  if (!e || !(isParticipant(db, user, e) || user.role === 'admin')) fail(404, MSG.notFound);
  if (!isParticipant(db, user, e)) fail(403, MSG.role);
  if (e.status === 'closed') fail(409, 'This enquiry is closed. Reopen it to reply.');
  e.replies.push({ id: newId(), authorId: user.id, message: v.message, createdAt: now() });
  e.status = e.buyerId === user.id ? 'open' : 'answered';
  e.updatedAt = now();
  return [201, enquiryOut(db, e)];
});
on('PATCH', '/enquiries/:id/status', (db, ctx) => {
  const user = needUser(db, ctx);
  const v = check(schemas.enquiryStatus, ctx.body);
  const e = byId(db.enquiries, ctx.params.id);
  if (!e || !isParticipant(db, user, e)) fail(404, MSG.notFound);
  e.status = v.status;
  e.updatedAt = now();
  return [200, enquiryOut(db, e)];
});

// Stories -----------------------------------------------------------------------------------------
function ownStory(db, ctx) {
  const user = needUser(db, ctx, 'artisan');
  return { user, find: () => ownStoryOf(db, user, ctx.params.id) };
}
function ownStoryOf(db, user, id) {
  const s = byId(db.stories, id);
  if (!s || s.artisanId !== myArtisan(db, user)?.id) fail(404, MSG.notFound);
  return s;
}
const editable = (s) => {
  if (!STORY_EDITABLE.includes(s.status))
    fail(409, 'This story is with a reviewer or already in the archive, so it cannot change now.');
};
on('GET', '/stories/mine', (db, ctx) => {
  const user = needUser(db, ctx, 'artisan');
  const a = myArtisan(db, user);
  return [
    200,
    sortWith(
      db.stories.filter((s) => s.artisanId === a?.id),
      desc((s) => s.updatedAt),
    ).map((s) => storyOut(db, s)),
  ];
});
on('POST', '/stories', (db, ctx) => {
  const user = needUser(db, ctx, 'artisan');
  const v = check(schemas.storyCreate, ctx.body);
  ensureArtisanProfile(db, user);
  const a = myArtisan(db, user);
  const s = {
    id: newId(),
    artisanId: a.id,
    title: v.title,
    language: v.language,
    craftType: v.craftType || a.craftType,
    text: v.text || '',
    audioUrl: null,
    audioIsSample: false,
    durationSec: null,
    transcript: [],
    translation: [],
    summary: { en: '' },
    tags: [],
    ai: null,
    status: 'draft',
    reviewNote: null,
    submittedAt: null,
    approvedAt: null,
    plays: 0,
    createdAt: now(),
    updatedAt: now(),
  };
  db.stories.push(s);
  return [201, storyOut(db, s)];
});
on('GET', '/stories/:id', (db, ctx) => {
  const user = needUser(db, ctx);
  const s = byId(db.stories, ctx.params.id);
  const ok =
    s &&
    (['reviewer', 'admin'].includes(user.role) ||
      (user.role === 'artisan' && s.artisanId === myArtisan(db, user)?.id));
  if (!ok) fail(404, MSG.notFound);
  return [200, storyOut(db, s)];
});
on('PUT', '/stories/:id', (db, ctx) => {
  const { find } = ownStory(db, ctx);
  const v = check(schemas.storyUpdate, ctx.body, true);
  const s = find();
  editable(s);
  if (v.transcript) v.transcript = normaliseSegments(v.transcript);
  if (v.translation) v.translation = normaliseSegments(v.translation);
  Object.assign(s, v, { updatedAt: now() });
  return [200, storyOut(db, s)];
});
on('POST', '/stories/:id/audio', async (db, ctx) => {
  const { find } = ownStory(db, ctx);
  const file = ctx.files?.audio;
  const v = validate(schemas.audioMeta, ctx.body);
  const errors = { ...v.errors };
  if (!file) errors.audio = 'Attach a recording.';
  else if (!AUDIO_TYPES.includes(baseMime(file.type)))
    errors.audio = 'Use a webm, mp4, m4a, ogg, mp3 or wav recording.';
  if (file && file.size > AUDIO_MAX_BYTES) fail(413, 'Recordings can be at most 10 MB.');
  if (Object.keys(errors).length) fail(422, MSG.invalid, { errors });
  const s = find();
  editable(s);
  s.audioUrl = await storeAudio(file);
  s.audioIsSample = false;
  s.durationSec = v.value.durationSec;
  s.updatedAt = now();
  return [200, storyOut(db, s)];
});
on('POST', '/stories/:id/submit', (db, ctx) => {
  const { find } = ownStory(db, ctx);
  const s = find();
  editable(s);
  if (!s.transcript.length && !String(s.text || '').trim())
    fail(422, MSG.invalid, {
      errors: { transcript: 'Add some text, or process the recording first.' },
    });
  Object.assign(s, { status: 'pending', submittedAt: now(), reviewNote: null, updatedAt: now() });
  return [200, storyOut(db, s)];
});
on('DELETE', '/stories/:id', (db, ctx) => {
  const user = needUser(db, ctx, 'artisan', 'admin');
  let s;
  if (user.role === 'admin') {
    s = byId(db.stories, ctx.params.id) || fail(404, MSG.notFound);
    audit(db, user, 'story.remove', 'story', s.id, { title: s.title });
  } else {
    s = ownStoryOf(db, user, ctx.params.id);
    editable(s);
  }
  db.stories = db.stories.filter((x) => x.id !== s.id);
  return [200, { id: s.id }];
});
on('POST', '/ai/stories/:id/process', (db, ctx) => {
  const { find } = ownStory(db, ctx);
  const s = find();
  editable(s);
  if (!s.audioUrl && !String(s.text || '').trim())
    fail(422, MSG.invalid, { errors: { audio: 'Record or upload audio, or type the story.' } });
  Object.assign(s, mockProcess(s), { updatedAt: now() });
  return [200, storyOut(db, s)];
});

// Review ------------------------------------------------------------------------------------------
on('GET', '/review/queue', (db, ctx) => {
  needUser(db, ctx, 'reviewer', 'admin');
  const list = sortWith(
    db.stories.filter((s) => s.status === 'pending'),
    asc((s) => s.submittedAt),
  );
  return [200, pageOf(list, ctx.query, (s) => storyOut(db, s))];
});
const reviewable = (db, id) => {
  const s = byId(db.stories, id);
  if (!s || s.status === 'draft') fail(404, MSG.notFound);
  return s;
};
on('GET', '/review/:storyId', (db, ctx) => {
  needUser(db, ctx, 'reviewer', 'admin');
  return [200, storyOut(db, reviewable(db, ctx.params.storyId))];
});
on('POST', '/review/:storyId/approve', (db, ctx) => {
  needUser(db, ctx, 'reviewer', 'admin');
  const v = check(schemas.approve, ctx.body);
  const s = reviewable(db, ctx.params.storyId);
  if (s.status !== 'pending') fail(409, 'Only stories waiting for review can be approved.');
  const edits = v.edits || {};
  if (edits.transcript) edits.transcript = normaliseSegments(edits.transcript);
  if (edits.translation) edits.translation = normaliseSegments(edits.translation);
  Object.assign(s, edits, {
    status: 'approved',
    approvedAt: now(),
    reviewNote: v.note || null,
    updatedAt: now(),
  });
  return [200, storyOut(db, s)];
});
on('POST', '/review/:storyId/reject', (db, ctx) => {
  needUser(db, ctx, 'reviewer', 'admin');
  const v = check(schemas.reject, ctx.body);
  const s = reviewable(db, ctx.params.storyId);
  if (s.status !== 'pending') fail(409, 'Only stories waiting for review can be sent back.');
  Object.assign(s, { status: 'rejected', reviewNote: v.note, updatedAt: now() });
  return [200, storyOut(db, s)];
});

// Archive -----------------------------------------------------------------------------------------
const approvedStories = (db) => db.stories.filter((s) => s.status === 'approved');
on('GET', '/archive', (db, { query }) => {
  let list = approvedStories(db).filter((s) => {
    const a = byId(db.artisans, s.artisanId);
    return (
      matchesAllWords(query.q, [
        s.title,
        s.summary?.en,
        a?.name,
        s.transcript.map((x) => x.text),
        s.translation.map((x) => x.text),
      ]) &&
      (!query.language || s.language === query.language) &&
      (!query.craftType || s.craftType === query.craftType)
    );
  });
  const sorts = {
    oldest: [asc((s) => s.approvedAt)],
    'most-played': [numDesc((s) => s.plays)],
  };
  list = sortWith(list, ...(sorts[query.sort] || [desc((s) => s.approvedAt)]));
  return [200, pageOf(list, query, (s) => archiveOut(db, s))];
});
const facet = (list, key) => {
  const m = {};
  list.forEach((s) => (m[s[key]] = (m[s[key]] || 0) + 1));
  return Object.keys(m)
    .sort(cmp)
    .map((k) => ({ key: k, count: m[k] }));
};
on('GET', '/archive/facets', (db) => {
  const list = approvedStories(db);
  return [200, { languages: facet(list, 'language'), craftTypes: facet(list, 'craftType') }];
});
on('GET', '/archive/:id', (db, { params }) => {
  const s = approvedStories(db).find((x) => x.id === params.id) || fail(404, MSG.notFound);
  return [200, V.archiveDetail(s, byId(db.artisans, s.artisanId))];
});
on('POST', '/archive/:id/play', (db, { params }) => {
  const s = approvedStories(db).find((x) => x.id === params.id) || fail(404, MSG.notFound);
  s.plays = (s.plays || 0) + 1;
  return [200, { plays: s.plays }];
});

// Apprenticeships ---------------------------------------------------------------------------------
on('GET', '/apprenticeships', (db, { query }) => {
  const status = query.status || 'open';
  let list = db.apprenticeships.filter((p) => {
    const a = byId(db.artisans, p.artisanId);
    return (
      matchesAllWords(query.q, [p.title, p.description, p.location, a?.name]) &&
      (!query.craftType || p.craftType === query.craftType) &&
      (status === 'all' || p.status === status)
    );
  });
  list = sortWith(
    list,
    query.sort === 'newest' ? desc((p) => p.createdAt) : asc((p) => p.deadline),
  );
  return [200, pageOf(list, query, (p) => apprOut(db, p))];
});
on('GET', '/apprenticeships/mine', (db, ctx) => {
  const user = needUser(db, ctx, 'artisan');
  const a = myArtisan(db, user);
  return [
    200,
    sortWith(
      db.apprenticeships.filter((p) => p.artisanId === a?.id),
      desc((p) => p.createdAt),
    ).map((p) => apprOut(db, p)),
  ];
});
on('POST', '/apprenticeships', (db, ctx) => {
  const user = needUser(db, ctx, 'artisan');
  const v = check(schemas.apprenticeship, ctx.body);
  ensureArtisanProfile(db, user);
  const p = {
    id: newId(),
    artisanId: myArtisan(db, user).id,
    stipend: null,
    ...v,
    status: 'open',
    createdAt: now(),
    updatedAt: now(),
  };
  db.apprenticeships.push(p);
  return [201, apprOut(db, p)];
});
on('GET', '/apprenticeships/:id', (db, { params }) => [
  200,
  apprOut(db, byId(db.apprenticeships, params.id) || fail(404, MSG.notFound)),
]);
on('PUT', '/apprenticeships/:id', (db, ctx) => {
  const user = needUser(db, ctx, 'artisan');
  const v = check(schemas.apprenticeshipUpdate, ctx.body, true);
  const p = byId(db.apprenticeships, ctx.params.id) || fail(404, MSG.notFound);
  if (p.artisanId !== myArtisan(db, user)?.id) fail(403, MSG.owner);
  Object.assign(p, v, { updatedAt: now() });
  return [200, apprOut(db, p)];
});
on('DELETE', '/apprenticeships/:id', (db, ctx) => {
  const user = needUser(db, ctx, 'artisan', 'admin');
  const p = byId(db.apprenticeships, ctx.params.id) || fail(404, MSG.notFound);
  if (user.role === 'artisan' && p.artisanId !== myArtisan(db, user)?.id) fail(403, MSG.owner);
  const appIds = db.applications.filter((a) => a.apprenticeshipId === p.id).map((a) => a.id);
  db.applications = db.applications.filter((a) => a.apprenticeshipId !== p.id);
  db.progress = db.progress.filter((x) => !appIds.includes(x.applicationId));
  db.apprenticeships = db.apprenticeships.filter((x) => x.id !== p.id);
  if (user.role === 'admin')
    audit(db, user, 'apprenticeship.remove', 'apprenticeship', p.id, { title: p.title });
  return [200, { id: p.id }];
});
on('GET', '/apprenticeships/:id/applications', (db, ctx) => {
  const user = needUser(db, ctx, 'artisan', 'admin');
  const p = byId(db.apprenticeships, ctx.params.id) || fail(404, MSG.notFound);
  if (user.role === 'artisan' && p.artisanId !== myArtisan(db, user)?.id) fail(403, MSG.owner);
  return [
    200,
    sortWith(
      db.applications.filter((a) => a.apprenticeshipId === p.id),
      asc((a) => a.createdAt),
    ).map((a) => appOut(db, a)),
  ];
});

// Applications ------------------------------------------------------------------------------------
on('POST', '/applications', (db, ctx) => {
  const user = needUser(db, ctx, 'learner');
  const v = check(schemas.application, ctx.body);
  const p = byId(db.apprenticeships, v.apprenticeshipId) || fail(404, MSG.notFound);
  if (p.status !== 'open' || new Date(p.deadline) <= new Date())
    fail(409, 'This opening is no longer taking applications.');
  if (db.applications.some((a) => a.apprenticeshipId === p.id && a.learnerId === user.id))
    fail(409, 'You have already applied for this opening.');
  const a = {
    id: newId(),
    apprenticeshipId: p.id,
    learnerId: user.id,
    motivation: v.motivation,
    status: 'applied',
    roadmap: ROADMAP_STEPS.map((s) => ({ ...s, done: false, doneAt: null })),
    certificateCode: null,
    createdAt: now(),
    updatedAt: now(),
  };
  db.applications.push(a);
  return [201, appOut(db, a)];
});
on('GET', '/applications/mine', (db, ctx) => {
  const user = needUser(db, ctx, 'learner');
  return [
    200,
    sortWith(
      db.applications.filter((a) => a.learnerId === user.id),
      desc((a) => a.createdAt),
    ).map((a) => appOut(db, a)),
  ];
});
const ownerApplication = (db, user, id) => {
  const a = byId(db.applications, id);
  const p = a && byId(db.apprenticeships, a.apprenticeshipId);
  if (!a || !p || p.artisanId !== myArtisan(db, user)?.id) fail(404, MSG.notFound);
  return { a, p };
};
on('PATCH', '/applications/:id/status', (db, ctx) => {
  const user = needUser(db, ctx, 'artisan');
  const v = check(schemas.applicationStatus, ctx.body);
  const { a } = ownerApplication(db, user, ctx.params.id);
  if (!canMoveApplication(a.status, v.status))
    fail(409, `An application that is ${a.status} cannot become ${v.status}.`);
  a.status = v.status;
  a.updatedAt = now();
  return [200, appOut(db, a)];
});
on('POST', '/applications/:id/complete', (db, ctx) => {
  const user = needUser(db, ctx, 'artisan');
  const { a, p } = ownerApplication(db, user, ctx.params.id);
  if (a.status !== 'accepted') fail(409, 'Only accepted apprentices can be marked complete.');
  let code;
  do code = certCode();
  while (db.certificates.some((c) => c.code === code));
  const cert = {
    id: newId(),
    code,
    applicationId: a.id,
    learnerName: byId(db.users, a.learnerId)?.name || '',
    artisanName: byId(db.artisans, p.artisanId)?.name || '',
    craftType: p.craftType,
    apprenticeshipTitle: p.title,
    durationWeeks: p.durationWeeks,
    issuedAt: now(),
  };
  db.certificates.push(cert);
  Object.assign(a, { status: 'completed', certificateCode: code, updatedAt: now() });
  return [200, { application: appOut(db, a), certificate: V.certificateView(cert) }];
});
const learnerApplication = (db, user, id) => {
  const a = byId(db.applications, id);
  if (!a || a.learnerId !== user.id) fail(404, MSG.notFound);
  return a;
};
on('PATCH', '/applications/:id/roadmap/:stepId', (db, ctx) => {
  const user = needUser(db, ctx, 'learner');
  const v = check(schemas.roadmap, ctx.body);
  const a = learnerApplication(db, user, ctx.params.id);
  const step = a.roadmap.find((s) => s.id === ctx.params.stepId) || fail(404, MSG.notFound);
  if (a.status !== 'accepted') fail(409, 'The roadmap opens once you are accepted.');
  step.done = v.done;
  step.doneAt = v.done ? now() : null;
  a.updatedAt = now();
  return [200, appOut(db, a)];
});
on('GET', '/applications/:id/progress', (db, ctx) => {
  const user = needUser(db, ctx, 'learner', 'artisan');
  if (user.role === 'learner') learnerApplication(db, user, ctx.params.id);
  else ownerApplication(db, user, ctx.params.id);
  return [
    200,
    sortWith(
      db.progress.filter((p) => p.applicationId === ctx.params.id),
      asc((p) => p.createdAt),
    ).map(V.progressView),
  ];
});
on('POST', '/applications/:id/progress', (db, ctx) => {
  const user = needUser(db, ctx, 'learner');
  const v = check(schemas.progress, ctx.body);
  const a = learnerApplication(db, user, ctx.params.id);
  if (a.status !== 'accepted') fail(409, 'You can log progress while your apprenticeship runs.');
  const p = {
    id: newId(),
    applicationId: a.id,
    note: v.note,
    photoUrl: v.photoUrl || null,
    createdAt: now(),
  };
  db.progress.push(p);
  return [201, V.progressView(p)];
});
on('GET', '/certificates/:code', (db, { params }) => {
  const c =
    db.certificates.find((x) => x.code === String(params.code).toUpperCase()) ||
    fail(404, 'No certificate has this code.');
  return [200, V.certificateView(c)];
});

// Impact ------------------------------------------------------------------------------------------
on('GET', '/impact', (db) => [
  200,
  { isSample: isSampleWorld(db.users), generatedAt: now(), ...impactTotals(db) },
]);
on('GET', '/impact/dashboard', (db, ctx) => {
  needUser(db, ctx, 'admin');
  return [200, impactDashboard(db)];
});

// Flags & admin -----------------------------------------------------------------------------------
on('POST', '/flags', (db, ctx) => {
  const user = needUser(db, ctx);
  const v = check(schemas.flag, ctx.body);
  const list = { story: db.stories, craft: db.crafts, artisan: db.artisans }[v.targetType];
  if (!byId(list, v.targetId)) fail(404, MSG.notFound);
  const f = {
    id: newId(),
    ...v,
    reporterId: user.id,
    status: 'open',
    resolution: null,
    resolvedAt: null,
    createdAt: now(),
  };
  db.flags.push(f);
  return [201, flagOut(db, f)];
});
on('GET', '/admin/users', (db, ctx) => {
  needUser(db, ctx, 'admin');
  const { q, role, active } = ctx.query;
  let list = db.users.filter(
    (u) =>
      matchesAllWords(q, [u.name, u.email]) &&
      (!role || u.role === role) &&
      (active === undefined || active === '' || String(u.active) === String(active)),
  );
  list = sortWith(
    list,
    asc((u) => u.name),
  );
  return [200, pageOf(list, ctx.query, V.userView)];
});
on('PATCH', '/admin/users/:id/role', (db, ctx) => {
  const admin = needUser(db, ctx, 'admin');
  const v = check(schemas.role, ctx.body);
  const u = byId(db.users, ctx.params.id) || fail(404, MSG.notFound);
  if (u.id === admin.id) fail(409, 'You cannot change your own role.');
  const from = u.role;
  u.role = v.role;
  u.updatedAt = now();
  if (u.role === 'artisan') ensureArtisanProfile(db, u);
  audit(db, admin, 'user.role', 'user', u.id, { from, to: v.role, name: u.name });
  return [200, V.userView(u)];
});
on('PATCH', '/admin/users/:id/active', (db, ctx) => {
  const admin = needUser(db, ctx, 'admin');
  const v = check(schemas.active, ctx.body);
  const u = byId(db.users, ctx.params.id) || fail(404, MSG.notFound);
  if (u.id === admin.id) fail(409, 'You cannot pause your own account.');
  u.active = v.active;
  u.updatedAt = now();
  audit(db, admin, v.active ? 'user.reactivate' : 'user.pause', 'user', u.id, { name: u.name });
  return [200, V.userView(u)];
});
on('GET', '/admin/flags', (db, ctx) => {
  needUser(db, ctx, 'admin');
  const status = ctx.query.status || 'open';
  const list = sortWith(
    db.flags.filter((f) => status === 'all' || f.status === status),
    desc((f) => f.createdAt),
  );
  return [200, pageOf(list, ctx.query, (f) => flagOut(db, f))];
});
on('POST', '/admin/flags/:id/resolve', (db, ctx) => {
  const admin = needUser(db, ctx, 'admin');
  const v = check(schemas.resolveFlag, ctx.body);
  const f = byId(db.flags, ctx.params.id) || fail(404, MSG.notFound);
  if (f.status !== 'open') fail(409, 'This report has already been handled.');
  const label = targetLabel(db, f);
  if (v.action === 'remove') {
    if (f.targetType === 'story') db.stories = db.stories.filter((s) => s.id !== f.targetId);
    if (f.targetType === 'craft') db.crafts = db.crafts.filter((c) => c.id !== f.targetId);
    if (f.targetType === 'artisan') {
      const a = byId(db.artisans, f.targetId);
      const u = a && byId(db.users, a.userId);
      if (u && u.id !== admin.id) u.active = false;
    }
  }
  Object.assign(f, {
    status: 'resolved',
    resolution: v.action === 'remove' ? 'removed' : 'dismissed',
    resolvedAt: now(),
    resolvedBy: admin.id,
  });
  audit(db, admin, `flag.${v.action}`, f.targetType, f.targetId, { flagId: f.id, label });
  return [200, V.flagView(f, { reporter: byId(db.users, f.reporterId), targetLabel: label })];
});
on('GET', '/admin/verifications', (db, ctx) => {
  needUser(db, ctx, 'admin');
  const status = VERIFY_LISTS.includes(ctx.query.status) ? ctx.query.status : 'pending';
  const list = sortWith(
    db.artisans.filter((a) => {
      const s = a.verifyStatus || 'none';
      return status === 'all' ? s !== 'none' : s === status;
    }),
    asc((a) => a.verifySubmittedAt),
  );
  return [
    200,
    pageOf(list, ctx.query, (a) => V.verificationItem(a, byId(db.users, a.verifyDecidedBy))),
  ];
});
on('POST', '/admin/verifications/:artisanId/decide', (db, ctx) => {
  const admin = needUser(db, ctx, 'admin');
  const v = check(schemas.verificationDecision, ctx.body);
  const a = byId(db.artisans, ctx.params.artisanId) || fail(404, MSG.notFound);
  const from = a.verifyStatus || 'none';
  const to = verifyDecision(from, v.action);
  if (!to) fail(409, VERIFY_MSG.nothingToDecide);
  Object.assign(a, {
    verifyStatus: to,
    verifyReason: v.action === 'reject' ? v.reason : null,
    verifyDecidedAt: now(),
    verifyDecidedBy: admin.id,
    updatedAt: now(),
  });
  audit(db, admin, verifyAuditAction(from, v.action), 'artisan', a.id, { name: a.name });
  return [200, V.verificationItem(a, admin)];
});
on('GET', '/admin/audit', (db, ctx) => {
  needUser(db, ctx, 'admin');
  const list = sortWith(
    db.audit,
    desc((a) => a.createdAt),
  );
  return [200, pageOf(list, ctx.query, (a) => V.auditView(a, byId(db.users, a.actorId)))];
});

// Uploads & demo ----------------------------------------------------------------------------------
on('POST', '/uploads/image', async (db, ctx) => {
  needUser(db, ctx);
  const file = ctx.files?.image;
  if (!file) fail(422, MSG.invalid, { errors: { image: 'Choose an image.' } });
  if (!IMAGE_TYPES.includes(baseMime(file.type)))
    fail(422, MSG.invalid, { errors: { image: 'Use a JPEG, PNG, WebP or GIF image.' } });
  if (file.size > IMAGE_MAX_BYTES) fail(413, 'Images can be at most 5 MB.');
  return [201, { url: await storeImage(file) }];
});
on('GET', '/demo', () => [
  200,
  {
    enabled: true,
    accounts: ROLES.map((role) => ({ role, email: demoEmail(role) })),
  },
]);
on('POST', '/demo/reset', () => {
  resetDb();
  return [200, { ok: true }];
});

// ---- dispatcher ----------------------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MUTATING = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Handle one request. Returns { status, body } where body is the response envelope.
 * opts: { body, query, token, files }
 */
export async function handle(method, url, opts = {}) {
  method = method.toUpperCase();
  const [path, qs] = String(url).split('?');
  const query = { ...Object.fromEntries(new URLSearchParams(qs || '')), ...(opts.query || {}) };
  Object.keys(query).forEach((k) => query[k] === undefined && delete query[k]);
  if (options.latency) await sleep(300 + Math.random() * 400);
  if (
    options.failRate > 0 &&
    method === 'GET' &&
    !path.startsWith('/auth') &&
    Math.random() < options.failRate
  )
    return {
      status: 503,
      body: { success: false, message: 'The print shop is busy. Try again in a moment.' },
    };
  for (const r of routes) {
    if (r.method !== method) continue;
    const m = path.match(r.re);
    if (!m) continue;
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    const db = getDb();
    const ctx = {
      params,
      query: sanitize(query),
      body: sanitize(opts.body ?? {}),
      token: opts.token || null,
      files: opts.files || {},
    };
    try {
      const [status, data] = await r.handler(db, ctx);
      if (MUTATING.includes(method) || path.startsWith('/auth')) save();
      return { status, body: { success: true, data: JSON.parse(JSON.stringify(data)) } };
    } catch (err) {
      if (!(err instanceof HttpError)) {
        console.error(err);
        return { status: 500, body: { success: false, message: 'Something broke on our side.' } };
      }
      const body = { success: false, message: err.message };
      if (err.code) body.code = err.code;
      if (err.errors) body.errors = err.errors;
      return { status: err.status, body };
    }
  }
  return { status: 404, body: { success: false, message: 'No such endpoint.' } };
}

export { resetDb };
