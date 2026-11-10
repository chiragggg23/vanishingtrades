// Runs the API against an in-memory MongoDB with the demo world loaded. No database install needed.
// Usage: npm run dev:memory   (data is lost when the process stops)
import { MongoMemoryServer } from 'mongodb-memory-server';
import { config } from './config/env.js';
import { connectDb } from './config/db.js';
import { createApp } from './app.js';
import { seedWorld } from './seed/seedWorld.js';

const mongo = await MongoMemoryServer.create();
await connectDb(mongo.getUri('vanishingtrades'));
const counts = await seedWorld();
console.log('In-memory MongoDB seeded:', counts);
const server = createApp().listen(config.port, () =>
  console.log(`VanishingTrades API (in-memory DB) on http://localhost:${config.port}/api`),
);
const stop = async () => {
  server.close();
  await mongo.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
