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

/** A new id that looks like a Mongo ObjectId (time-ordered). */
export function newId() {
  const ts = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, '0');
  let rest = '';
  for (let i = 0; i < 16; i++) rest += Math.floor(Math.random() * 16).toString(16);
  return ts + rest;
}

export const isId = (v) => typeof v === 'string' && /^[0-9a-f]{24}$/.test(v);
