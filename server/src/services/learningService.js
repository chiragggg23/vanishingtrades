// Apprenticeships, applications, the 5-step roadmap, progress logs and certificates (SDG 4).
import {
  Application,
  Apprenticeship,
  Artisan,
  Certificate,
  ProgressLog,
  User,
} from '../models/index.js';
import { ROADMAP_STEPS } from '../../../shared/constants.js';
import { canMoveApplication, certCode } from '../../../shared/rules.js';
import { fail, MSG, plain, toId } from '../utils/http.js';
import {
  V,
  audit,
  byIds,
  ensureArtisanProfile,
  findPlain,
  mustFind,
  myArtisan,
  pagedAggregate,
} from './common.js';

async function countsFor(ids) {
  const rows = await Application.aggregate([
    { $match: { apprenticeshipId: { $in: ids.map(toId) } } },
    { $group: { _id: '$apprenticeshipId', n: { $sum: 1 } } },
  ]);
  const m = Object.fromEntries(rows.map((r) => [String(r._id), r.n]));
  return (id) => m[id] || 0;
}
async function apprOut(p, artisan) {
  const count = await countsFor([p.id]);
  return V.apprenticeshipView(p, artisan || (await findPlain(Artisan, p.artisanId)), count(p.id));
}
async function appsOut(list) {
  const apprs = await byIds(
    Apprenticeship,
    list.map((a) => a.apprenticeshipId),
  );
  const artisans = await byIds(
    Artisan,
    Object.values(apprs).map((p) => p.artisanId),
  );
  const learners = await byIds(
    User,
    list.map((a) => a.learnerId),
  );
  return list.map((a) => {
    const p = apprs[a.apprenticeshipId];
    return V.applicationView(a, {
      apprenticeship: p,
      artisan: p ? artisans[p.artisanId] : null,
      learner: learners[a.learnerId],
    });
  });
}
const appOut = async (a) => (await appsOut([a]))[0];

// ---- apprenticeships -----------------------------------------------------------------------------
export async function list(query) {
  const status = query.status || 'open';
  const match = {};
  if (query.craftType) match.craftType = query.craftType;
  if (status !== 'all') match.status = status;
  const page = await pagedAggregate(Apprenticeship, {
    match,
    lookupArtisan: true,
    q: query.q,
    qFields: ['title', 'description', 'location', 'artisanDoc.name'],
    sort: query.sort === 'newest' ? { createdAt: -1 } : { deadline: 1 },
    query,
  });
  const count = await countsFor(page.items.map((p) => p.id));
  return {
    items: page.items.map((p) => V.apprenticeshipView(p, p.artisanDoc, count(p.id))),
    pagination: page.pagination,
  };
}

export async function mine(user) {
  const a = await myArtisan(user);
  if (!a) return [];
  const list = plain(
    await Apprenticeship.find({ artisanId: toId(a.id) })
      .sort({ createdAt: -1, _id: -1 })
      .lean(),
  );
  const count = await countsFor(list.map((p) => p.id));
  return list.map((p) => V.apprenticeshipView(p, a, count(p.id)));
}

export async function create(user, body) {
  const a = await ensureArtisanProfile(user);
  const doc = await Apprenticeship.create({
    stipend: null,
    ...body,
    artisanId: toId(a.id),
    status: 'open',
  });
  return V.apprenticeshipView(plain(doc.toObject()), a, 0);
}

export async function getOne(id) {
  return apprOut(await mustFind(Apprenticeship, id));
}

export async function update(user, id, body) {
  const p = await mustFind(Apprenticeship, id);
  const a = await myArtisan(user);
  if (p.artisanId !== a?.id) fail(403, MSG.owner);
  const doc = plain(
    await Apprenticeship.findByIdAndUpdate(id, { $set: body }, { new: true }).lean(),
  );
  return apprOut(doc, a);
}

export async function remove(user, id) {
  const p = await mustFind(Apprenticeship, id);
  if (user.role === 'artisan' && p.artisanId !== (await myArtisan(user))?.id) fail(403, MSG.owner);
  const apps = await Application.find({ apprenticeshipId: toId(id) }, { _id: 1 }).lean();
  await ProgressLog.deleteMany({ applicationId: { $in: apps.map((x) => x._id) } });
  await Application.deleteMany({ apprenticeshipId: toId(id) });
  await Apprenticeship.deleteOne({ _id: toId(id) });
  if (user.role === 'admin')
    await audit(user, 'apprenticeship.remove', 'apprenticeship', p.id, { title: p.title });
  return { id: p.id };
}

export async function applicationsFor(user, id) {
  const p = await mustFind(Apprenticeship, id);
  if (user.role === 'artisan' && p.artisanId !== (await myArtisan(user))?.id) fail(403, MSG.owner);
  const list = plain(
    await Application.find({ apprenticeshipId: toId(id) })
      .sort({ createdAt: 1, _id: 1 })
      .lean(),
  );
  return appsOut(list);
}

// ---- applications --------------------------------------------------------------------------------
export async function apply(user, { apprenticeshipId, motivation }) {
  const p = await mustFind(Apprenticeship, apprenticeshipId);
  if (p.status !== 'open' || new Date(p.deadline) <= new Date())
    fail(409, 'This opening is no longer taking applications.');
  if (await Application.exists({ apprenticeshipId: toId(p.id), learnerId: toId(user.id) }))
    fail(409, 'You have already applied for this opening.');
  const doc = await Application.create({
    apprenticeshipId: toId(p.id),
    learnerId: toId(user.id),
    motivation,
    status: 'applied',
    roadmap: ROADMAP_STEPS.map((s) => ({ ...s, done: false, doneAt: null })),
    certificateCode: null,
  });
  return appOut(plain(doc.toObject()));
}

export async function mineAsLearner(user) {
  const list = plain(
    await Application.find({ learnerId: toId(user.id) })
      .sort({ createdAt: -1, _id: -1 })
      .lean(),
  );
  return appsOut(list);
}

async function ownerApplication(user, id) {
  const a = await findPlain(Application, id);
  const p = a && (await findPlain(Apprenticeship, a.apprenticeshipId));
  const me = await myArtisan(user);
  if (!a || !p || p.artisanId !== me?.id) fail(404, MSG.notFound);
  return { a, p, me };
}
async function learnerApplication(user, id) {
  const a = await findPlain(Application, id);
  if (!a || a.learnerId !== user.id) fail(404, MSG.notFound);
  return a;
}

export async function setStatus(user, id, { status }) {
  const { a } = await ownerApplication(user, id);
  if (!canMoveApplication(a.status, status))
    fail(409, `An application that is ${a.status} cannot become ${status}.`);
  return appOut(
    plain(await Application.findByIdAndUpdate(id, { $set: { status } }, { new: true }).lean()),
  );
}

export async function complete(user, id) {
  const { a, p, me } = await ownerApplication(user, id);
  if (a.status !== 'accepted') fail(409, 'Only accepted apprentices can be marked complete.');
  let code;
  do code = certCode();
  while (await Certificate.exists({ code }));
  const learner = await findPlain(User, a.learnerId);
  const cert = await Certificate.create({
    code,
    applicationId: toId(a.id),
    learnerName: learner?.name || '',
    artisanName: me?.name || '',
    craftType: p.craftType,
    apprenticeshipTitle: p.title,
    durationWeeks: p.durationWeeks,
    issuedAt: new Date(),
  });
  const updated = plain(
    await Application.findByIdAndUpdate(
      id,
      { $set: { status: 'completed', certificateCode: code } },
      { new: true },
    ).lean(),
  );
  return {
    application: await appOut(updated),
    certificate: V.certificateView(plain(cert.toObject())),
  };
}

export async function setStep(user, id, stepId, { done }) {
  const a = await learnerApplication(user, id);
  const step = a.roadmap.find((s) => s.id === stepId) || fail(404, MSG.notFound);
  if (a.status !== 'accepted') fail(409, 'The roadmap opens once you are accepted.');
  const doc = await Application.findOneAndUpdate(
    { _id: toId(id), 'roadmap.id': step.id },
    { $set: { 'roadmap.$.done': done, 'roadmap.$.doneAt': done ? new Date() : null } },
    { new: true },
  ).lean();
  return appOut(plain(doc));
}

export async function progress(user, id) {
  if (user.role === 'learner') await learnerApplication(user, id);
  else await ownerApplication(user, id);
  const list = plain(
    await ProgressLog.find({ applicationId: toId(id) })
      .sort({ createdAt: 1, _id: 1 })
      .lean(),
  );
  return list.map(V.progressView);
}

export async function addProgress(user, id, { note, photoUrl }) {
  const a = await learnerApplication(user, id);
  if (a.status !== 'accepted') fail(409, 'You can log progress while your apprenticeship runs.');
  const doc = await ProgressLog.create({
    applicationId: toId(a.id),
    note,
    photoUrl: photoUrl || null,
  });
  return V.progressView(plain(doc.toObject()));
}

export async function certificate(code) {
  const c = await Certificate.findOne({ code: String(code).toUpperCase() }).lean();
  if (!c) fail(404, 'No certificate has this code.');
  return V.certificateView(plain(c));
}
