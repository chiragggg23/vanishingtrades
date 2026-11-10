import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';
import { User } from '../models/index.js';
import { signToken } from '../middleware/auth.js';
import { fail, MSG, plain } from '../utils/http.js';
import { V, ensureArtisanProfile } from './common.js';

export async function login({ email, password }) {
  const user = await User.findOne({ email }).lean();
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) fail(401, 'Email or password is wrong.');
  if (user.active === false) fail(403, MSG.paused, { code: 'ACCOUNT_PAUSED' });
  const u = plain(user);
  return { token: signToken(u.id), user: V.userView(u) };
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

export async function updateMe(user, patch) {
  const doc = await User.findByIdAndUpdate(user.id, { $set: patch }, { new: true }).lean();
  return V.userView(plain(doc));
}
