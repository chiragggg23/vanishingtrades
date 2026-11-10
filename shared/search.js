// "Every word matches in any listed field" search, shared by the mock and the server.
export const searchWords = (q) =>
  String(q ?? '')
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, 10);

export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** values: array of strings (or arrays of strings) for one record. */
export function matchesAllWords(q, values) {
  const words = searchWords(q);
  if (!words.length) return true;
  const fields = values
    .flat(Infinity)
    .filter((v) => v !== null && v !== undefined)
    .map((v) => String(v).toLowerCase());
  return words.every((w) => fields.some((f) => f.includes(w)));
}

/** Mongo filter equivalent of matchesAllWords. */
export function mongoAllWords(q, fields) {
  const words = searchWords(q);
  if (!words.length) return {};
  return {
    $and: words.map((w) => ({
      $or: fields.map((f) => ({ [f]: { $regex: escapeRegex(w), $options: 'i' } })),
    })),
  };
}

export function paginate(page, limit, total) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages };
}

export function pageParams(query = {}, defLimit = 12) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = defLimit;
  if (limit > 50) limit = 50;
  return { page, limit, skip: (page - 1) * limit };
}

/** Byte-order string compare (matches MongoDB's default binary collation for BMP text). */
export const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
