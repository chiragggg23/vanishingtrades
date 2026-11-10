import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../models/index.js';
import { fail, isObjectId, MSG } from '../utils/http.js';
import { plain } from '../utils/http.js';

export const signToken = (userId) =>
  jwt.sign({ sub: String(userId) }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

/**
 * Require a valid token. The user is loaded from the database on every request, so a paused
 * account is rejected immediately, not when its token expires.
 */
export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) fail(401, MSG.auth);
    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch {
      fail(401, MSG.auth);
    }
    if (!isObjectId(payload.sub)) fail(401, MSG.auth);
    const user = await User.findById(payload.sub).lean();
    if (!user) fail(401, MSG.auth);
    if (user.active === false) fail(403, MSG.paused, { code: 'ACCOUNT_PAUSED' });
    req.user = plain(user);
    next();
  } catch (err) {
    next(err);
  }
}

/** Role lock, enforced on the server. Use after requireAuth. */
export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!roles.includes(req.user?.role))
      return next(Object.assign(new Error(MSG.role), { status: 403 }));
    next();
  };

/** requireAuth + requireRole in one. */
export const auth = (...roles) =>
  roles.length ? [requireAuth, requireRole(...roles)] : [requireAuth];
