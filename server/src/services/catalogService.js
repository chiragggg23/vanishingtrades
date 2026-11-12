// Artisans and crafts (the gallery). SDG 8.
import { Application, Apprenticeship, Artisan, Craft, Story } from '../models/index.js';
import { CRAFT_TYPES } from '../../../shared/constants.js';
import { VERIFY_MSG } from '../../../shared/rules.js';
import { fail, MSG, plain, toId } from '../utils/http.js';
import {
  V,
  artisanCounts,
  artisanOut,
  artisanOwnerOut,
  audit,
  ensureArtisanProfile,
  findPlain,
  mustFind,
  myArtisan,
  pagedAggregate,
} from './common.js';

const has = (v) => v !== undefined && v !== '';

export async function listArtisans(query) {
  const match = {};
  if (has(query.craftType)) match.craftType = query.craftType;
  if (has(query.district)) match.district = query.district;
  const sort =
    query.sort === 'experience'
      ? { yearsOfPractice: -1 }
      : query.sort === 'newest'
        ? { createdAt: -1 }
        : { name: 1 };
  const page = await pagedAggregate(Artisan, {
    match,
    q: query.q,
    qFields: ['name', 'village', 'district', 'bio.en'],
    sort,
    query,
  });
  const counts = await artisanCounts(page.items.map((a) => a.id));
  return {
    items: page.items.map((a) => V.artisanView(a, counts(a.id))),
    pagination: page.pagination,
  };
}

export async function featuredArtisans() {
  const list = plain(
    await Artisan.find({ featured: true }).sort({ name: 1, _id: 1 }).limit(6).lean(),
  );
  const counts = await artisanCounts(list.map((a) => a.id));
  return list.map((a) => V.artisanView(a, counts(a.id)));
}

export async function myProfile(user) {
  return artisanOwnerOut(await ensureArtisanProfile(user));
}

export async function updateMyProfile(user, patch) {
  const a = await ensureArtisanProfile(user);
  const doc = plain(await Artisan.findByIdAndUpdate(a.id, { $set: patch }, { new: true }).lean());
  return artisanOwnerOut(doc);
}

/** An artisan asks to be verified. An admin decides (adminService.decideVerification). */
export async function requestVerification(user, { idType, idNumber, note }) {
  const a = await ensureArtisanProfile(user);
  const status = a.verifyStatus || 'none';
  if (status === 'pending') fail(409, VERIFY_MSG.pending);
  if (status === 'verified') fail(409, VERIFY_MSG.verified);
  const doc = plain(
    await Artisan.findByIdAndUpdate(
      a.id,
      {
        $set: {
          verifyStatus: 'pending',
          verifyIdType: idType,
          verifyIdNumber: idNumber,
          verifyNote: note ?? null,
          verifyReason: null,
          verifySubmittedAt: new Date(),
          verifyDecidedAt: null,
          verifyDecidedBy: null,
        },
      },
      { new: true },
    ).lean(),
  );
  return artisanOwnerOut(doc);
}

export async function getArtisan(id) {
  const a = await mustFind(Artisan, id);
  const [crafts, stories, appr] = await Promise.all([
    Craft.find({ artisanId: toId(a.id) })
      .sort({ createdAt: -1, _id: -1 })
      .lean(),
    Story.find({ artisanId: toId(a.id), status: 'approved' })
      .sort({ approvedAt: -1, _id: -1 })
      .lean(),
    Apprenticeship.find({ artisanId: toId(a.id), status: 'open' })
      .sort({ deadline: 1, _id: 1 })
      .lean(),
  ]);
  const apprIds = appr.map((p) => p._id);
  const appCounts = await Application.aggregate([
    { $match: { apprenticeshipId: { $in: apprIds } } },
    { $group: { _id: '$apprenticeshipId', n: { $sum: 1 } } },
  ]);
  const ac = Object.fromEntries(appCounts.map((x) => [String(x._id), x.n]));
  return {
    ...(await artisanOut(a)),
    crafts: plain(crafts).map((c) => V.craftView(c, a)),
    stories: plain(stories).map((s) => V.archiveItem(s, a)),
    apprenticeships: plain(appr).map((p) => V.apprenticeshipView(p, a, ac[p.id] || 0)),
  };
}

// ---- crafts --------------------------------------------------------------------------------------
export const craftTypes = () => CRAFT_TYPES;

export async function listCrafts(query) {
  const match = {};
  if (has(query.craftType)) match.craftType = query.craftType;
  const after = [];
  if (has(query.district)) after.push({ $match: { 'artisanDoc.district': query.district } });
  const min = has(query.minPrice) ? Number(query.minPrice) : NaN;
  const max = has(query.maxPrice) ? Number(query.maxPrice) : NaN;
  if (!Number.isNaN(min)) match.priceMax = { $ne: null, $gte: min };
  if (!Number.isNaN(max)) match.priceMin = { $ne: null, $lte: max };
  const sorts = {
    oldest: { createdAt: 1 },
    'price-asc': { _pMin: 1 },
    'price-desc': { _pMax: -1 },
    title: { 'title.en': 1 },
  };
  after.push({
    $addFields: { _pMin: { $ifNull: ['$priceMin', 1e12] }, _pMax: { $ifNull: ['$priceMax', -1] } },
  });
  const page = await pagedAggregate(Craft, {
    match,
    lookupArtisan: true,
    after,
    q: query.q,
    qFields: ['title.en', 'title.kn', 'title.hi', 'description.en', 'materials', 'artisanDoc.name'],
    sort: sorts[query.sort] || { createdAt: -1 },
    query,
  });
  return {
    items: page.items.map((c) => V.craftView(c, c.artisanDoc)),
    pagination: page.pagination,
  };
}

export async function myCrafts(user) {
  const a = await myArtisan(user);
  if (!a) return [];
  const list = plain(
    await Craft.find({ artisanId: toId(a.id) })
      .sort({ createdAt: -1, _id: -1 })
      .lean(),
  );
  return list.map((c) => V.craftView(c, a));
}

export async function createCraft(user, body) {
  const a = await ensureArtisanProfile(user);
  const doc = await Craft.create({
    materials: [],
    priceMin: null,
    priceMax: null,
    imageUrl: null,
    ...body,
    artisanId: toId(a.id),
    seed: `work-${Date.now().toString(16).slice(-6)}`,
  });
  return V.craftView(plain(doc.toObject()), a);
}

export async function getCraft(id) {
  const c = await mustFind(Craft, id);
  return V.craftView(c, await findPlain(Artisan, c.artisanId));
}

export async function updateCraft(user, id, body) {
  const c = await mustFind(Craft, id);
  const a = await myArtisan(user);
  if (c.artisanId !== a?.id) fail(403, MSG.owner);
  const merged = { ...c, ...body };
  if (
    typeof merged.priceMin === 'number' &&
    typeof merged.priceMax === 'number' &&
    merged.priceMax < merged.priceMin
  )
    fail(422, MSG.invalid, {
      errors: { priceMax: 'The highest price must be at least the lowest price.' },
    });
  const doc = plain(await Craft.findByIdAndUpdate(id, { $set: body }, { new: true }).lean());
  return V.craftView(doc, a);
}

export async function deleteCraft(user, id) {
  const c = await mustFind(Craft, id);
  if (user.role === 'artisan' && c.artisanId !== (await myArtisan(user))?.id) fail(403, MSG.owner);
  await Craft.deleteOne({ _id: toId(id) });
  if (user.role === 'admin')
    await audit(user, 'craft.remove', 'craft', c.id, { title: c.title.en });
  return { id: c.id };
}
