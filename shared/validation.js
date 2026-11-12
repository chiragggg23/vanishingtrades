// Dependency-free schema validation shared by the server, the browser mock and client forms,
// so a 422 has exactly the same field paths and messages everywhere.
import {
  CRAFT_KEYS,
  FLAG_TARGETS,
  LANGS,
  PUBLIC_ROLES,
  ROLES,
  STORY_LANGS,
  VERIFY_ID_TYPES,
} from './constants.js';

export const M = {
  required: () => 'This is required.',
  min: (n) => `Use at least ${n} characters.`,
  max: (n) => `Use at most ${n} characters.`,
  type: () => 'This value has the wrong type.',
  oneOf: (v) => `Choose one of: ${v.join(', ')}.`,
  int: (a, b) => `Enter a whole number from ${a} to ${b}.`,
  num: (a, b) => `Enter a number from ${a} to ${b}.`,
  email: () => 'Enter a valid email address.',
  date: () => 'Enter a valid date.',
  future: () => 'Pick a date in the future.',
  items: (n) => `Add at most ${n} items.`,
  priceOrder: () => 'The highest price must be at least the lowest price.',
};

// ---- schema builders --------------------------------------------------------------------------
export const str = (min, max, o = {}) => ({ t: 'str', min, max, ...o });
export const int = (min, max, o = {}) => ({ t: 'int', min, max, ...o });
export const num = (min, max, o = {}) => ({ t: 'num', min, max, ...o });
export const bool = (o = {}) => ({ t: 'bool', ...o });
export const oneOf = (values, o = {}) => ({ t: 'enum', values, ...o });
export const email = (o = {}) => ({ t: 'email', ...o });
export const date = (o = {}) => ({ t: 'date', ...o });
export const arr = (item, max, o = {}) => ({ t: 'arr', item, max, ...o });
export const obj = (shape, o = {}) => ({ t: 'obj', shape, ...o });
export const localized = (enMin, max, o = {}) =>
  obj(
    {
      en: str(enMin, max, { required: enMin > 0 }),
      kn: str(0, max, { nullable: true }),
      hi: str(0, max, { nullable: true }),
    },
    o,
  );
const url = () => str(0, 500, { nullable: true });
const segment = obj({
  start: num(0, 100000, { nullable: true }),
  end: num(0, 100000, { nullable: true }),
  text: str(1, 1000, { required: true }),
});
const segments = arr(segment, 200);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function check(schema, value, path, errors, partial, msgs = M) {
  if (value === undefined) {
    if (schema.required && !partial) errors[path] = msgs.required();
    return undefined;
  }
  if (value === null) {
    if (schema.nullable) return null;
    if (schema.required) errors[path] = msgs.required();
    return undefined;
  }
  switch (schema.t) {
    case 'str': {
      if (typeof value !== 'string') return void (errors[path] = msgs.type());
      const v = schema.trim === false ? value : value.trim();
      if (v.length === 0 && schema.required) return void (errors[path] = msgs.required());
      if (v.length === 0 && schema.min > 0) return schema.nullable ? null : undefined;
      if (v.length < schema.min) return void (errors[path] = msgs.min(schema.min));
      if (v.length > schema.max) return void (errors[path] = msgs.max(schema.max));
      return v;
    }
    case 'email': {
      if (typeof value !== 'string') return void (errors[path] = msgs.type());
      const v = value.trim().toLowerCase();
      if (v.length > 120 || !EMAIL_RE.test(v)) return void (errors[path] = msgs.email());
      return v;
    }
    case 'int':
    case 'num': {
      const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
      const ok =
        typeof n === 'number' &&
        Number.isFinite(n) &&
        (schema.t === 'num' || Number.isInteger(n)) &&
        n >= schema.min &&
        n <= schema.max;
      if (!ok)
        return void (errors[path] = (schema.t === 'int' ? msgs.int : msgs.num)(
          schema.min,
          schema.max,
        ));
      return n;
    }
    case 'bool': {
      if (typeof value === 'boolean') return value;
      if (value === 'true' || value === 'false') return value === 'true';
      return void (errors[path] = msgs.type());
    }
    case 'enum': {
      if (!schema.values.includes(value)) return void (errors[path] = msgs.oneOf(schema.values));
      return value;
    }
    case 'date': {
      const d = new Date(value);
      if (typeof value !== 'string' || Number.isNaN(d.getTime()))
        return void (errors[path] = msgs.date());
      if (schema.future && d.getTime() <= Date.now()) return void (errors[path] = msgs.future());
      return d.toISOString();
    }
    case 'arr': {
      if (!Array.isArray(value)) return void (errors[path] = msgs.type());
      if (value.length > schema.max) return void (errors[path] = msgs.items(schema.max));
      return value.map((item, i) => check(schema.item, item, `${path}.${i}`, errors, false, msgs));
    }
    case 'obj': {
      if (typeof value !== 'object' || Array.isArray(value))
        return void (errors[path] = msgs.type());
      const out = {};
      for (const [k, s] of Object.entries(schema.shape)) {
        const r = check(s, value[k], path ? `${path}.${k}` : k, errors, false, msgs);
        if (r !== undefined) out[k] = r;
      }
      return out;
    }
    default:
      return value;
  }
}

/**
 * Validate `data` against an object schema.
 * partial: required top-level fields may be absent (used for PUT/PATCH).
 * Returns { ok, value, errors } where value only contains known keys.
 */
export function validate(schema, data, { partial = false, messages = M } = {}) {
  const errors = {};
  const value = {};
  const input = data && typeof data === 'object' ? data : {};
  for (const [k, s] of Object.entries(schema.shape)) {
    const r = check(s, input[k], k, errors, partial, messages);
    if (r !== undefined) value[k] = r;
  }
  if (schema.refine) schema.refine(value, errors, messages);
  return { ok: Object.keys(errors).length === 0, value, errors };
}

const priceRefine = (v, errors, msgs = M) => {
  if (
    typeof v.priceMin === 'number' &&
    typeof v.priceMax === 'number' &&
    v.priceMax < v.priceMin &&
    !errors.priceMax
  )
    errors.priceMax = msgs.priceOrder();
};

const rejectNeedsReason = (v, errors, msgs = M) => {
  if (v.action === 'reject' && !v.reason && !errors.reason) errors.reason = msgs.required();
};

// ---- schemas from docs/API_CONTRACT.md ------------------------------------------------------------
export const schemas = {
  login: obj({ email: email({ required: true }), password: str(1, 72, { required: true }) }),
  register: obj({
    name: str(2, 80, { required: true }),
    email: email({ required: true }),
    password: str(8, 72, { required: true, trim: false }),
    role: oneOf(PUBLIC_ROLES, { required: true }),
  }),
  updateMe: obj({ name: str(2, 80), preferredLang: oneOf(LANGS) }),
  artisan: obj({
    name: str(2, 80),
    craftType: oneOf(CRAFT_KEYS),
    village: str(2, 60),
    district: str(2, 60),
    bio: localized(0, 600),
    yearsOfPractice: int(0, 90),
    languages: arr(oneOf(LANGS), 5),
    avatarUrl: url(),
  }),
  craft: {
    ...obj({
      title: localized(3, 80, { required: true }),
      craftType: oneOf(CRAFT_KEYS, { required: true }),
      description: localized(10, 1000, { required: true }),
      materials: arr(str(2, 40, { required: true }), 8),
      priceMin: int(0, 10000000, { nullable: true }),
      priceMax: int(0, 10000000, { nullable: true }),
      imageUrl: url(),
    }),
    refine: priceRefine,
  },
  enquiry: obj({
    artisanId: str(1, 64, { required: true }),
    craftId: str(1, 64, { nullable: true }),
    subject: str(3, 120, { required: true }),
    message: str(10, 1000, { required: true }),
  }),
  reply: obj({ message: str(1, 1000, { required: true }) }),
  enquiryStatus: obj({ status: oneOf(['open', 'closed'], { required: true }) }),
  storyCreate: obj({
    title: str(3, 120, { required: true }),
    language: oneOf(STORY_LANGS, { required: true }),
    craftType: oneOf(CRAFT_KEYS),
    text: str(0, 5000),
  }),
  storyUpdate: obj({
    title: str(3, 120, { required: true }),
    language: oneOf(STORY_LANGS, { required: true }),
    craftType: oneOf(CRAFT_KEYS, { required: true }),
    text: str(0, 5000),
    transcript: segments,
    translation: segments,
    summary: obj({ en: str(0, 600) }),
    tags: arr(str(2, 30, { required: true }), 8),
  }),
  audioMeta: obj({ durationSec: num(1, 1800, { required: true }) }),
  approve: obj({
    edits: obj({
      title: str(3, 120),
      transcript: segments,
      translation: segments,
      summary: obj({ en: str(0, 600) }),
    }),
    note: str(0, 500, { nullable: true }),
  }),
  reject: obj({ note: str(5, 500, { required: true }) }),
  apprenticeship: obj({
    title: str(3, 120, { required: true }),
    craftType: oneOf(CRAFT_KEYS, { required: true }),
    description: str(20, 2000, { required: true }),
    seats: int(1, 20, { required: true }),
    durationWeeks: int(1, 104, { required: true }),
    stipend: int(0, 100000, { nullable: true }),
    location: str(2, 120, { required: true }),
    deadline: date({ required: true, future: true }),
  }),
  apprenticeshipUpdate: obj({
    title: str(3, 120, { required: true }),
    craftType: oneOf(CRAFT_KEYS, { required: true }),
    description: str(20, 2000, { required: true }),
    seats: int(1, 20, { required: true }),
    durationWeeks: int(1, 104, { required: true }),
    stipend: int(0, 100000, { nullable: true }),
    location: str(2, 120, { required: true }),
    deadline: date({ required: true }),
    status: oneOf(['open', 'closed'], { required: true }),
  }),
  application: obj({
    apprenticeshipId: str(1, 64, { required: true }),
    motivation: str(20, 1000, { required: true }),
  }),
  applicationStatus: obj({
    status: oneOf(['shortlisted', 'accepted', 'rejected'], { required: true }),
  }),
  roadmap: obj({ done: bool({ required: true }) }),
  progress: obj({ note: str(5, 1000, { required: true }), photoUrl: url() }),
  flag: obj({
    targetType: oneOf(FLAG_TARGETS, { required: true }),
    targetId: str(1, 64, { required: true }),
    reason: str(5, 500, { required: true }),
  }),
  role: obj({ role: oneOf(ROLES, { required: true }) }),
  active: obj({ active: bool({ required: true }) }),
  resolveFlag: obj({ action: oneOf(['dismiss', 'remove'], { required: true }) }),
  verificationRequest: obj({
    idType: oneOf(VERIFY_ID_TYPES, { required: true }),
    idNumber: str(4, 40, { required: true }),
    note: str(0, 500, { nullable: true }),
  }),
  verificationDecision: {
    ...obj({
      action: oneOf(['approve', 'reject'], { required: true }),
      reason: str(5, 300, { nullable: true }),
    }),
    refine: rejectNeedsReason,
  },
};

/** Remove keys that start with "$" or contain "." (operator-injection guard). */
export function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('$') || k.includes('.')) continue;
      out[k] = sanitize(v);
    }
    return out;
  }
  return value;
}
