import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

const make = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => config.rateLimits.disabled,
    handler: (_req, res) => res.status(429).json({ success: false, message }),
  });

export const limits = {
  auth: make(15 * 60 * 1000, 30, 'Too many sign-in attempts. Wait a few minutes and try again.'),
  uploads: make(15 * 60 * 1000, 40, 'Too many uploads. Wait a few minutes and try again.'),
  ai: make(15 * 60 * 1000, 20, 'The AI needs a breather. Wait a few minutes and try again.'),
  play: make(60 * 1000, 30, 'That story has been played a lot just now. Try again in a minute.'),
  demo: make(60 * 60 * 1000, 10, 'The demo was reset recently. Try again later.'),
};

/** Exposed for tests: a limiter with a tiny budget that is never skipped. */
export const strictLimiter = (limit) =>
  rateLimit({
    windowMs: 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ success: false, message: 'Too many requests.' }),
  });
