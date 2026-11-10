// Direct buyer enquiries (SDG 8). Only participants (and admins, read-only) can see them.
import { randomUUID } from 'node:crypto';
import { Artisan, Craft, Enquiry, User } from '../models/index.js';
import { pageParams, paginate } from '../../../shared/search.js';
import { fail, MSG, plain, toId } from '../utils/http.js';
import { V, byIds, findPlain, myArtisan } from './common.js';

async function viewMany(list) {
  const users = await byIds(
    User,
    list.flatMap((e) => [e.buyerId, ...e.replies.map((r) => r.authorId)]),
  );
  const artisans = await byIds(
    Artisan,
    list.map((e) => e.artisanId),
  );
  const crafts = await byIds(
    Craft,
    list.map((e) => e.craftId),
  );
  return list.map((e) =>
    V.enquiryView(e, {
      buyer: users[e.buyerId],
      artisan: artisans[e.artisanId],
      craft: e.craftId ? crafts[e.craftId] : null,
      usersById: users,
    }),
  );
}
const viewOne = async (e) => (await viewMany([e]))[0];

async function isParticipant(user, e) {
  if (e.buyerId === user.id) return true;
  const a = await findPlain(Artisan, e.artisanId);
  return a?.userId === user.id;
}

export async function create(user, body) {
  const a = (await findPlain(Artisan, body.artisanId)) || fail(404, MSG.notFound);
  if (body.craftId) {
    const c = await findPlain(Craft, body.craftId);
    if (!c || c.artisanId !== a.id)
      fail(422, MSG.invalid, { errors: { craftId: 'This piece does not belong to the artisan.' } });
  }
  const doc = await Enquiry.create({
    buyerId: toId(user.id),
    artisanId: toId(a.id),
    craftId: body.craftId ? toId(body.craftId) : null,
    subject: body.subject,
    message: body.message,
    status: 'open',
    replies: [],
  });
  return viewOne(plain(doc.toObject()));
}

export async function list(user, query) {
  const filter = {};
  if (user.role === 'buyer') filter.buyerId = toId(user.id);
  if (user.role === 'artisan') {
    const a = await myArtisan(user);
    filter.artisanId = a ? toId(a.id) : null;
  }
  if (query.status) filter.status = query.status;
  const { page, limit, skip } = pageParams(query);
  const [docs, total] = await Promise.all([
    Enquiry.find(filter).sort({ updatedAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    Enquiry.countDocuments(filter),
  ]);
  return { items: await viewMany(plain(docs)), pagination: paginate(page, limit, total) };
}

export async function getOne(user, id) {
  const e = await findPlain(Enquiry, id);
  if (!e || (user.role !== 'admin' && !(await isParticipant(user, e)))) fail(404, MSG.notFound);
  return viewOne(e);
}

export async function reply(user, id, { message }) {
  const e = await findPlain(Enquiry, id);
  const participant = e && (await isParticipant(user, e));
  if (!e || !(participant || user.role === 'admin')) fail(404, MSG.notFound);
  if (!participant) fail(403, MSG.role);
  if (e.status === 'closed') fail(409, 'This enquiry is closed. Reopen it to reply.');
  const doc = await Enquiry.findByIdAndUpdate(
    id,
    {
      $push: {
        replies: { id: randomUUID(), authorId: toId(user.id), message, createdAt: new Date() },
      },
      $set: { status: e.buyerId === user.id ? 'open' : 'answered' },
    },
    { new: true },
  ).lean();
  return viewOne(plain(doc));
}

export async function setStatus(user, id, { status }) {
  const e = await findPlain(Enquiry, id);
  if (!e || !(await isParticipant(user, e))) fail(404, MSG.notFound);
  const doc = await Enquiry.findByIdAndUpdate(id, { $set: { status } }, { new: true }).lean();
  return viewOne(plain(doc));
}
