// Wipes every collection in the database at MONGODB_URI and creates one admin account.
// Use it to turn a demo database into a clean, real installation.
//
//   MONGODB_URI=... ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/fresh-start.js --yes
//
// Refuses to run without --yes. Demo mode on the API is not checked here:
// switch DEMO_MODE off on the API first, or its reset button can bring the demo data back.
import bcrypt from 'bcryptjs';
import { connectDb, disconnectDb } from '../src/config/db.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/index.js';
import { clearAll } from '../src/seed/seedWorld.js';

const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';
const name = (process.env.ADMIN_NAME || 'Administrator').trim();
const safeUri = config.mongoUri.replace(/\/\/[^@]+@/, '//***@');

if (!process.argv.includes('--yes')) {
  console.error(`This deletes ALL data at ${safeUri}. Re-run with --yes to confirm.`);
  process.exit(1);
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || password.length < 8) {
  console.error('Set ADMIN_EMAIL to a valid email and ADMIN_PASSWORD to at least 8 characters.');
  process.exit(1);
}

try {
  await connectDb();
  const before = await User.estimatedDocumentCount();
  await clearAll();
  await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, Math.max(config.bcryptRounds, 10)),
    role: 'admin',
    active: true,
    preferredLang: 'en',
    demo: false,
  });
  console.log(`Wiped ${safeUri} (had ${before} users) and created admin ${email}.`);
} catch (err) {
  console.error('Fresh start failed:', err.message);
  process.exitCode = 1;
} finally {
  await disconnectDb();
}
