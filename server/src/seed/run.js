// npm run seed        -> loads the demo world into an empty database (refuses if data exists)
// npm run seed:reset  -> wipes the database and loads the demo world again
import { connectDb, disconnectDb } from '../config/db.js';
import { config } from '../config/env.js';
import { User } from '../models/index.js';
import { seedWorld } from './seedWorld.js';

const reset = process.argv.includes('--reset');
const safeUri = config.mongoUri.replace(/\/\/[^@]+@/, '//***@');

try {
  await connectDb();
  const existing = await User.estimatedDocumentCount();
  if (existing > 0 && !reset) {
    console.log(
      `The database at ${safeUri} already has ${existing} users. Run "npm run seed:reset" to wipe it and seed again.`,
    );
  } else {
    const counts = await seedWorld();
    console.log(`Seeded ${safeUri}:`, counts);
    if (!counts.demoAccounts)
      console.log('Demo logins are switched off (SEED_DEMO_ACCOUNTS=false).');
  }
} catch (err) {
  console.error('Seeding failed:', err.message);
  process.exitCode = 1;
} finally {
  await disconnectDb();
}
