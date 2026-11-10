import { config } from './config/env.js';
import { connectDb } from './config/db.js';
import { createApp } from './app.js';
import { User } from './models/index.js';
import { seedWorld } from './seed/seedWorld.js';

await connectDb();
// Seed an empty demo database on first start (demo mode only), so a fresh deploy is usable.
if (config.demoMode && (await User.estimatedDocumentCount()) === 0) {
  console.log('Empty database in demo mode: seeding the demo world.');
  await seedWorld();
}
const app = createApp();
app.listen(config.port, () => {
  console.log(
    `VanishingTrades API listening on http://localhost:${config.port}/api (${config.env})`,
  );
});
