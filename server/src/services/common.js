// Lookups and paging helpers shared by the services.
import { Artisan, AuditLog, Craft, Story, User } from '../models/index.js';
import { mongoAllWords, pageParams, paginate } from '../../../shared/search.js';
import * as V from '../../../shared/views.js';
import { fail, isObjectId, MSG, plain, toId } from '../utils/http.js';

export { V, plain };

export const findPlain = async (Model, id) =>
  isObjectId(id) ? plain(await Model.findById(id).lean()) : null;
export const mustFind = async (Model, id, message = MSG.notFound) =>
  (await findPlain(Model, id)) || fail(404, message);

export async function byIds(Model, ids) {
  const valid = [...new Set(ids.filter(Boolean).map(String))].filter(isObjectId);
  if (!valid.length) return {};
  const docs = await Model.find({ _id: { $in: valid.map(toId) } }).lean();
  return Object.fromEntries(docs.map((d) => [String(d._id), plain(d)]));
}

/** The signed-in artisan's profile (plain) or null. */
export async function myArtisan(user) {
  return plain(await Artisan.findOne({ userId: toId(user.id) }).lean());
}

export async function ensureArtisanProfile(user) {
  const existing = await myArtisan(user);
  if (existing) return existing;
  const a = await Artisan.create({
    userId: toId(user.id),
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
  });
  return plain(a.toObject());
}

/** Works and approved-story counts for many artisans at once. */
export async function artisanCounts(ids) {
  const objIds = ids.map(toId).filter(Boolean);
  const [works, stories] = await Promise.all([
    Craft.aggregate([
      { $match: { artisanId: { $in: objIds } } },
      { $group: { _id: '$artisanId', n: { $sum: 1 } } },
    ]),
    Story.aggregate([
      { $match: { artisanId: { $in: objIds }, status: 'approved' } },
      { $group: { _id: '$artisanId', n: { $sum: 1 } } },
    ]),
  ]);
  const w = Object.fromEntries(works.map((x) => [String(x._id), x.n]));
  const s = Object.fromEntries(stories.map((x) => [String(x._id), x.n]));
  return (id) => ({ worksCount: w[id] || 0, storiesCount: s[id] || 0 });
}

export async function artisanOut(a) {
  const counts = await artisanCounts([a.id]);
  return V.artisanView(a, counts(a.id));
}

/** The artisan's own profile, with their (private) verification request. */
export async function artisanOwnerOut(a) {
  const counts = await artisanCounts([a.id]);
  return V.artisanOwnerView(a, counts(a.id));
}

/**
 * Paged aggregation with an optional artisan $lookup, "every word" search and id tie-break.
 * Returns { items (plain, with `artisanDoc`), pagination }.
 */
export async function pagedAggregate(
  Model,
  { match = {}, lookupArtisan = false, after = [], q, qFields = [], sort, query },
) {
  const { page, limit, skip } = pageParams(query);
  const pipeline = [{ $match: match }];
  if (lookupArtisan)
    pipeline.push(
      {
        $lookup: {
          from: 'artisans',
          localField: 'artisanId',
          foreignField: '_id',
          as: 'artisanDoc',
        },
      },
      { $unwind: { path: '$artisanDoc', preserveNullAndEmptyArrays: true } },
    );
  pipeline.push(...after);
  const qMatch = mongoAllWords(q, qFields);
  if (qMatch.$and) pipeline.push({ $match: qMatch });
  pipeline.push(
    { $sort: { ...sort, _id: Object.values(sort)[0] === -1 ? -1 : 1 } },
    { $facet: { items: [{ $skip: skip }, { $limit: limit }], total: [{ $count: 'n' }] } },
  );
  const [res] = await Model.aggregate(pipeline);
  const total = res.total[0]?.n || 0;
  return { items: plain(res.items), pagination: paginate(page, limit, total) };
}

export async function audit(actor, action, targetType, targetId, details = {}) {
  await AuditLog.create({
    actorId: toId(actor.id),
    action,
    targetType,
    targetId: String(targetId),
    details,
  });
}

export const usersById = (ids) => byIds(User, ids);
