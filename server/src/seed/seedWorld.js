// Loads the shared demo world (shared/seed.js) into MongoDB. The same data powers the browser mock.
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { buildSeed } from '../../../shared/seed.js';
import { synthHumWav } from '../../../shared/wav.js';
import {
  ALL_MODELS,
  Application,
  Apprenticeship,
  Artisan,
  AuditLog,
  Certificate,
  Craft,
  Enquiry,
  Flag,
  ProgressLog,
  Story,
  User,
} from '../models/index.js';
import { saveAudio } from '../services/storage.js';

const oid = (v) => (v ? new mongoose.Types.ObjectId(v) : null);
const date = (v) => (v ? new Date(v) : null);
const REF_FIELDS = [
  'userId',
  'artisanId',
  'craftId',
  'buyerId',
  'apprenticeshipId',
  'learnerId',
  'applicationId',
  'reporterId',
  'targetId',
  'authorId',
  'actorId',
  'verifyDecidedBy',
];
const DATE_FIELDS = [
  'createdAt',
  'updatedAt',
  'submittedAt',
  'approvedAt',
  'deadline',
  'doneAt',
  'issuedAt',
  'resolvedAt',
  'processedAt',
  'verifySubmittedAt',
  'verifyDecidedAt',
];

/** Convert a plain seed record into a raw Mongo document (ObjectIds and Dates). */
function toDoc(rec, top = true) {
  const out = {};
  for (const [k, v] of Object.entries(rec)) {
    // Top-level records get their _id; embedded ones (segments, replies, roadmap steps) keep a
    // string `id`.
    if (k === 'id') {
      if (top) out._id = oid(v);
      else out.id = v;
    } else if (REF_FIELDS.includes(k)) out[k] = oid(v);
    else if (DATE_FIELDS.includes(k)) out[k] = date(v);
    else if (Array.isArray(v))
      out[k] = v.map((x) => (x && typeof x === 'object' ? toDoc(x, false) : x));
    else if (v && typeof v === 'object') out[k] = toDoc(v, false);
    else out[k] = v;
  }
  return out;
}

export async function clearAll() {
  await Promise.all(ALL_MODELS.map((M) => M.deleteMany({})));
}

/**
 * Seed the demo world.
 * options.writeAudio: create the WAV hum files for sample stories (default true).
 * options.demoAccounts: keep demo1234 logins (default config.seedDemoAccounts). When false, every
 *   seeded account gets a random unusable password, and ADMIN_EMAIL/ADMIN_PASSWORD (if set) creates
 *   a real admin.
 */
export async function seedWorld({
  now = new Date(),
  writeAudio = true,
  demoAccounts = config.seedDemoAccounts,
} = {}) {
  await clearAll();
  await Promise.all(ALL_MODELS.map((M) => M.init()));
  const w = buildSeed(now);

  const hashes = new Map();
  const hashFor = async (pw) => {
    if (!hashes.has(pw)) hashes.set(pw, await bcrypt.hash(pw, config.bcryptRounds));
    return hashes.get(pw);
  };
  const users = [];
  for (const u of w.users) {
    const { password, ...rest } = u;
    const pw = demoAccounts ? password : randomBytes(24).toString('hex');
    users.push({ ...toDoc(rest), passwordHash: await hashFor(pw) });
  }
  if (!demoAccounts && config.adminEmail && config.adminPassword) {
    users.push({
      _id: new mongoose.Types.ObjectId(),
      name: 'Administrator',
      email: config.adminEmail.toLowerCase(),
      passwordHash: await bcrypt.hash(config.adminPassword, config.bcryptRounds),
      role: 'admin',
      active: true,
      preferredLang: 'en',
      demo: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const s of w.stories) {
    if (s.hasSampleAudio) {
      s.audioUrl = writeAudio
        ? await saveAudio(
            Buffer.from(synthHumWav(s.id, s.durationSec)),
            'audio/wav',
            `seed-${s.id}`,
          )
        : `/uploads/audio/seed-${s.id}.wav`;
    }
    delete s.hasSampleAudio;
  }

  // Raw inserts keep the seed's ids and dates exactly (Mongoose timestamps would overwrite them).
  await User.collection.insertMany(users);
  await Artisan.collection.insertMany(w.artisans.map((r) => toDoc(r)));
  await Craft.collection.insertMany(w.crafts.map((r) => toDoc(r)));
  await Story.collection.insertMany(w.stories.map((r) => toDoc(r)));
  await Enquiry.collection.insertMany(w.enquiries.map((r) => toDoc(r)));
  await Apprenticeship.collection.insertMany(w.apprenticeships.map((r) => toDoc(r)));
  await Application.collection.insertMany(w.applications.map((r) => toDoc(r)));
  await ProgressLog.collection.insertMany(w.progress.map((r) => toDoc(r)));
  await Certificate.collection.insertMany(w.certificates.map((r) => toDoc(r)));
  await Flag.collection.insertMany(w.flags.map((r) => toDoc(r)));
  await AuditLog.deleteMany({});
  return {
    users: users.length,
    artisans: w.artisans.length,
    crafts: w.crafts.length,
    stories: w.stories.length,
    enquiries: w.enquiries.length,
    apprenticeships: w.apprenticeships.length,
    applications: w.applications.length,
    certificates: w.certificates.length,
    flags: w.flags.length,
    demoAccounts,
  };
}
