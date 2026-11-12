// Impact numbers, user management, flags and the audit log.
import {
  Application,
  Apprenticeship,
  Artisan,
  AuditLog,
  Certificate,
  Craft,
  Enquiry,
  Flag,
  Story,
  User,
} from '../models/index.js';
import { impactDashboard, impactTotals, isSampleWorld } from '../../../shared/impact.js';
import { matchesAllWords, pageParams, paginate, mongoAllWords } from '../../../shared/search.js';
import {
  VERIFY_LISTS,
  VERIFY_MSG,
  verifyAuditAction,
  verifyDecision,
} from '../../../shared/rules.js';
import { fail, MSG, plain, toId } from '../utils/http.js';
import { V, audit, byIds, ensureArtisanProfile, findPlain, mustFind } from './common.js';

async function world() {
  const [users, artisans, crafts, stories, enquiries, apprenticeships, applications, certificates] =
    await Promise.all([
      User.find({}, { demo: 1 }).lean(),
      Artisan.find({}, { userId: 1 }).lean(),
      Craft.find({}, { craftType: 1, createdAt: 1 }).lean(),
      Story.find(
        {},
        { status: 1, language: 1, durationSec: 1, plays: 1, submittedAt: 1, approvedAt: 1 },
      ).lean(),
      Enquiry.find({}, { artisanId: 1, replies: 1, createdAt: 1 }).lean(),
      Apprenticeship.find({}, { status: 1 }).lean(),
      Application.find({}, { status: 1, learnerId: 1, createdAt: 1 }).lean(),
      Certificate.find({}, { issuedAt: 1 }).lean(),
    ]);
  return plain({
    users,
    artisans,
    crafts,
    stories,
    enquiries,
    apprenticeships,
    applications,
    certificates,
  });
}

export async function impact() {
  const w = await world();
  return {
    isSample: isSampleWorld(w.users),
    generatedAt: new Date().toISOString(),
    ...impactTotals(w),
  };
}
export const dashboard = async () => impactDashboard(await world());

// ---- flags ---------------------------------------------------------------------------------------
const TARGET_MODEL = { story: Story, craft: Craft, artisan: Artisan };
async function labelFor(f) {
  const t = await findPlain(TARGET_MODEL[f.targetType], f.targetId);
  if (!t) return null;
  return f.targetType === 'story' ? t.title : f.targetType === 'craft' ? t.title?.en : t.name;
}
async function flagOut(f, label) {
  return V.flagView(f, {
    reporter: await findPlain(User, f.reporterId),
    targetLabel: label ?? (await labelFor(f)),
  });
}

export async function report(user, body) {
  if (!(await findPlain(TARGET_MODEL[body.targetType], body.targetId))) fail(404, MSG.notFound);
  const doc = await Flag.create({
    ...body,
    targetId: toId(body.targetId),
    reporterId: toId(user.id),
    status: 'open',
  });
  return flagOut(plain(doc.toObject()));
}

export async function flags(query) {
  const status = query.status || 'open';
  const filter = status === 'all' ? {} : { status };
  const { page, limit, skip } = pageParams(query);
  const [list, total] = await Promise.all([
    Flag.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    Flag.countDocuments(filter),
  ]);
  const items = [];
  for (const f of plain(list)) items.push(await flagOut(f));
  return { items, pagination: paginate(page, limit, total) };
}

export async function resolveFlag(admin, id, { action }) {
  const f = await mustFind(Flag, id);
  if (f.status !== 'open') fail(409, 'This report has already been handled.');
  const label = await labelFor(f);
  if (action === 'remove') {
    if (f.targetType === 'story') await Story.deleteOne({ _id: toId(f.targetId) });
    if (f.targetType === 'craft') await Craft.deleteOne({ _id: toId(f.targetId) });
    if (f.targetType === 'artisan') {
      const a = await findPlain(Artisan, f.targetId);
      if (a && a.userId !== admin.id)
        await User.updateOne({ _id: toId(a.userId) }, { $set: { active: false } });
    }
  }
  const doc = plain(
    await Flag.findByIdAndUpdate(
      id,
      {
        $set: {
          status: 'resolved',
          resolution: action === 'remove' ? 'removed' : 'dismissed',
          resolvedAt: new Date(),
          resolvedBy: toId(admin.id),
        },
      },
      { new: true },
    ).lean(),
  );
  await audit(admin, `flag.${action}`, f.targetType, f.targetId, { flagId: f.id, label });
  return flagOut(doc, label);
}

// ---- artisan verification ------------------------------------------------------------------------
export async function verifications(query) {
  const status = VERIFY_LISTS.includes(query.status) ? query.status : 'pending';
  const filter = {
    verifyStatus: status === 'all' ? { $in: ['pending', 'verified', 'rejected'] } : status,
  };
  const { page, limit, skip } = pageParams(query);
  const [list, total] = await Promise.all([
    Artisan.find(filter).sort({ verifySubmittedAt: 1, _id: 1 }).skip(skip).limit(limit).lean(),
    Artisan.countDocuments(filter),
  ]);
  const items = plain(list);
  const deciders = await byIds(
    User,
    items.map((a) => a.verifyDecidedBy),
  );
  return {
    items: items.map((a) => V.verificationItem(a, deciders[a.verifyDecidedBy])),
    pagination: paginate(page, limit, total),
  };
}

export async function decideVerification(admin, artisanId, { action, reason }) {
  const a = await mustFind(Artisan, artisanId);
  const from = a.verifyStatus || 'none';
  const to = verifyDecision(from, action);
  if (!to) fail(409, VERIFY_MSG.nothingToDecide);
  const doc = plain(
    await Artisan.findByIdAndUpdate(
      a.id,
      {
        $set: {
          verifyStatus: to,
          verifyReason: action === 'reject' ? reason : null,
          verifyDecidedAt: new Date(),
          verifyDecidedBy: toId(admin.id),
        },
      },
      { new: true },
    ).lean(),
  );
  await audit(admin, verifyAuditAction(from, action), 'artisan', a.id, { name: a.name });
  return V.verificationItem(doc, admin);
}

// ---- users ---------------------------------------------------------------------------------------
export async function users(query) {
  const filter = { ...mongoAllWords(query.q, ['name', 'email']) };
  if (query.role) filter.role = query.role;
  if (query.active === 'true' || query.active === 'false') filter.active = query.active === 'true';
  const { page, limit, skip } = pageParams(query);
  const [list, total] = await Promise.all([
    User.find(filter).sort({ name: 1, _id: 1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  return { items: plain(list).map(V.userView), pagination: paginate(page, limit, total) };
}

export async function setRole(admin, id, { role }) {
  const u = await mustFind(User, id);
  if (u.id === admin.id) fail(409, 'You cannot change your own role.');
  const doc = plain(await User.findByIdAndUpdate(id, { $set: { role } }, { new: true }).lean());
  if (role === 'artisan') await ensureArtisanProfile(doc);
  await audit(admin, 'user.role', 'user', u.id, { from: u.role, to: role, name: u.name });
  return V.userView(doc);
}

export async function setActive(admin, id, { active }) {
  const u = await mustFind(User, id);
  if (u.id === admin.id) fail(409, 'You cannot pause your own account.');
  const doc = plain(await User.findByIdAndUpdate(id, { $set: { active } }, { new: true }).lean());
  await audit(admin, active ? 'user.reactivate' : 'user.pause', 'user', u.id, { name: u.name });
  return V.userView(doc);
}

export async function auditLog(query) {
  const { page, limit, skip } = pageParams(query);
  const [list, total] = await Promise.all([
    AuditLog.find({}).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments({}),
  ]);
  const items = plain(list);
  const actors = await byIds(
    User,
    items.map((a) => a.actorId),
  );
  return {
    items: items.map((a) => V.auditView(a, actors[a.actorId])),
    pagination: paginate(page, limit, total),
  };
}

export { matchesAllWords };
