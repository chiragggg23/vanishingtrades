// Lifecycle rules and small pure helpers shared by the mock and the server.
import { CERT_ALPHABET } from './constants.js';

export const STORY_EDITABLE = ['draft', 'rejected'];

const APPLICATION_MOVES = {
  applied: ['shortlisted', 'accepted', 'rejected'],
  shortlisted: ['accepted', 'rejected'],
};
export const canMoveApplication = (from, to) => (APPLICATION_MOVES[from] || []).includes(to);

/** Generate a certificate code VT-XXXX-XXXX. `rand` returns [0,1). */
export function certCode(rand = Math.random) {
  const pick = () => CERT_ALPHABET[Math.floor(rand() * CERT_ALPHABET.length)];
  const block = () => Array.from({ length: 4 }, pick).join('');
  return `VT-${block()}-${block()}`;
}
export const CERT_RE =
  /^VT-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/;

/** Segment ids are reassigned seg-1..n on every write. */
export const normaliseSegments = (segs = []) =>
  segs.map((s, i) => ({
    id: `seg-${i + 1}`,
    start: typeof s.start === 'number' ? s.start : null,
    end: typeof s.end === 'number' ? s.end : null,
    text: s.text,
  }));

// Same layout as a Mongo ObjectId: 4-byte time, 5-byte process random, 3-byte counter, so ids
// made later always sort after earlier ones (the tie-break rule depends on it).
const PROCESS_RANDOM = Array.from({ length: 10 }, () =>
  Math.floor(Math.random() * 16).toString(16),
).join('');
let counter = Math.floor(Math.random() * 0xffff);
/** A new id that looks like a Mongo ObjectId and increases monotonically. */
export function newId() {
  const ts = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, '0');
  counter = (counter + 1) % 0xffffff;
  return ts + PROCESS_RANDOM + counter.toString(16).padStart(6, '0');
}

export const isId = (v) => typeof v === 'string' && /^[0-9a-f]{24}$/.test(v);

/** Messages for the artisan verification flow (same text from the mock and the server). */
export const VERIFY_MSG = {
  pending: 'Your request is already waiting for an admin.',
  verified: 'Your profile is already verified.',
  nothingToDecide: 'There is no verification to decide for this artisan.',
};
export const VERIFY_LISTS = ['pending', 'verified', 'rejected', 'all'];
/** What an admin decision does to a status, or null when it is not allowed. */
export function verifyDecision(from, action) {
  if (action === 'approve') return from === 'pending' ? 'verified' : null;
  if (action === 'reject') return from === 'pending' || from === 'verified' ? 'rejected' : null;
  return null;
}
export const verifyAuditAction = (from, action) =>
  action === 'approve'
    ? 'artisan.verify'
    : from === 'verified'
      ? 'artisan.unverify'
      : 'artisan.verify_reject';
