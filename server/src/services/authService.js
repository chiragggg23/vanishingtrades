import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';
import { User } from '../models/index.js';
import { signToken } from '../middleware/auth.js';
import { fail, MSG, plain } from '../utils/http.js';
import { V, ensureArtisanProfile } from './common.js';

// Compared against when the email is unknown, so a missing account costs the same bcrypt time as
// a wrong password and response timing does not reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('no-such-account-placeholder', config.bcryptRounds);

export async function login({ email, password }) {
  const user = await User.findOne({ email }).lean();
  const matches = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  const ok = Boolean(user) && matches;
  if (!ok) fail(401, 'Email or password is wrong.');
  if (user.active === false) fail(403, MSG.paused, { code: 'ACCOUNT_PAUSED' });
  const u = plain(user);
  return { token: signToken(u.id, user.tokenVersion ?? 0), user: V.userView(u) };
}

export async function register({ name, email, password, role }) {
  if (await User.exists({ email }))
    fail(409, 'That email is already registered. Try signing in.', {
      errors: { email: 'Already registered.' },
    });
  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
  const doc = await User.create({ name, email, passwordHash, role, demo: false });
  const u = plain(doc.toObject());
  if (u.role === 'artisan') await ensureArtisanProfile(u);
  return { token: signToken(u.id), user: V.userView(u) };
}

export const me = (user) => V.userView(user);

/** Revokes every token this user holds (all devices). */
export async function logout(user) {
  await User.updateOne({ _id: user.id }, { $inc: { tokenVersion: 1 } });
  return { ok: true };
}

export async function updateMe(user, patch) {
  const doc = await User.findByIdAndUpdate(user.id, { $set: patch }, { new: true }).lean();
  return V.userView(plain(doc));
}
