import 'dotenv/config';
import { fileURLToPath } from 'node:url';

const bool = (v, d = false) =>
  v === undefined || v === '' ? d : ['1', 'true', 'yes'].includes(String(v).toLowerCase());
const list = (v) =>
  String(v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test' || Boolean(process.env.VITEST);

if (isProd && !process.env.JWT_SECRET) {
  // Refuse to start in production without a real secret.
  throw new Error('JWT_SECRET must be set in production.');
}

export const config = {
  env: NODE_ENV,
  isProd,
  isTest,
  port: Number(process.env.PORT) || 4000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vanishingtrades',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || (isTest ? 4 : 10),
  corsOrigins: [
    ...new Set([
      'http://localhost:5173',
      'http://localhost:4173',
      ...list(process.env.CORS_ORIGINS),
    ]),
  ],
  demoMode: bool(process.env.DEMO_MODE, !isProd),
  seedDemoAccounts: bool(process.env.SEED_DEMO_ACCOUNTS, true),
  adminEmail: process.env.ADMIN_EMAIL || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  publicUrl: (process.env.PUBLIC_URL || '').replace(/\/$/, ''),
  uploadsDir: process.env.UPLOADS_DIR || fileURLToPath(new URL('../../uploads/', import.meta.url)),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  ai: {
    provider: (process.env.AI_PROVIDER || 'mock').toLowerCase(),
    groqKey: process.env.GROQ_API_KEY || '',
    groqTextModel: process.env.GROQ_TEXT_MODEL || 'llama-3.3-70b-versatile',
    groqSpeechModel: process.env.GROQ_SPEECH_MODEL || 'whisper-large-v3',
    timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 25000,
  },
  rateLimits: {
    disabled: bool(process.env.RATE_LIMIT_DISABLED, isTest),
  },
  logRequests: !isTest,
};

export const hasCloudinary = () =>
  Boolean(config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret);
