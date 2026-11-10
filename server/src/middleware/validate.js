import { validate as runSchema, sanitize } from '../../../shared/validation.js';
import { fail, MSG } from '../utils/http.js';

/**
 * Validate req.body against a shared schema (the same module the mock and the client use).
 * The cleaned value replaces req.body; unknown fields are dropped.
 */
export const validateBody =
  (schema, { partial = false } = {}) =>
  (req, _res, next) => {
    try {
      const r = runSchema(schema, req.body || {}, { partial });
      if (!r.ok) fail(422, MSG.invalid, { errors: r.errors });
      req.body = r.value;
      next();
    } catch (err) {
      next(err);
    }
  };

/** Strip `$` and dotted keys from body, query and params (operator-injection guard). */
export function sanitizeRequest(req, _res, next) {
  if (req.body && typeof req.body === 'object') req.body = sanitize(req.body);
  // Express 4 query is a plain object we may replace.
  if (req.query && typeof req.query === 'object') {
    const clean = sanitize(req.query);
    // Only string values are meaningful as query filters.
    for (const k of Object.keys(clean)) if (typeof clean[k] !== 'string') delete clean[k];
    req.query = clean;
  }
  next();
}
