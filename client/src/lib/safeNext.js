/**
 * The page to return to after signing in, or null if `next` is not a safe in-app path.
 * Only plain same-site paths are allowed: "/x", never "//host", "/\host" (browsers read the
 * backslash as a slash), absolute URLs or anything with control characters.
 */
export function safeNext(next) {
  if (typeof next !== 'string' || !next.startsWith('/')) return null;
  if (next.startsWith('//') || next.includes('\\')) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(next)) return null;
  return next;
}
