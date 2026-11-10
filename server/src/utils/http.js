import mongoose from 'mongoose';

/** An error that becomes the failure envelope with this status. */
export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    Object.assign(this, extra);
  }
}
export const fail = (status, message, extra) => {
  throw new HttpError(status, message, extra);
};

export const MSG = {
  auth: 'Please sign in.',
  role: 'Your account cannot do this.',
  owner: 'Only the owner can change this.',
  notFound: 'We could not find that.',
  invalid: 'Please check the highlighted fields.',
  paused: 'This account is paused. Contact the VanishingTrades team.',
};

/** Wrap an async route handler so rejections reach the error middleware. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

const { ObjectId } = mongoose.Types;
export const isObjectId = (v) => typeof v === 'string' && /^[0-9a-f]{24}$/i.test(v);
export const toId = (v) => (isObjectId(v) ? new ObjectId(v) : null);

/**
 * Convert lean Mongo documents into the plain shape the shared views expect:
 * `_id` becomes `id`, ObjectIds become hex strings, Dates become ISO strings.
 */
export function plain(v) {
  if (v === null || v === undefined) return v;
  if (v instanceof ObjectId || v?._bsontype === 'ObjectId') return v.toString();
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(plain);
  if (typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      if (k === '__v') continue;
      if (k === '_id') {
        if (!('id' in v)) out.id = plain(val);
        continue;
      }
      out[k] = plain(val);
    }
    return out;
  }
  return v;
}
