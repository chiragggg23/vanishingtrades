// End-to-end smoke test through the real UI against the real API (in-memory MongoDB).
// Usage (from the repo root):
//   PLAYWRIGHT_DIR=<folder with playwright-core installed> node scripts/e2e-smoke.mjs
// It builds the client with VITE_USE_MOCK=false, starts the API and `vite preview`, drives the
// main flows in headless Chrome/Edge, prints PASS/FAIL per step and exits non-zero on failure.
import { synthHumWav } from '../shared/wav.js';
import { oid } from '../shared/seed.js';
import { WEB, browserPath, loadPlaywright, startStack } from './lib/stack.mjs';

const results = [];
const STORY = `Smoke test ${Date.now().toString(36)}: the cycle-wheel lathe`;
const OPENING = `Smoke opening ${Date.now().toString(36)}`;

async function step(name, fn) {
  const t = Date.now();
  try {
    const note = await fn();
    results.push({ name, ok: true, ms: Date.now() - t, note });
    console.log(`PASS  ${name}${note ? ` (${note})` : ''}`);
  } catch (err) {
    results.push({ name, ok: false, ms: Date.now() - t, note: err.message.split('\n')[0] });
    console.log(`FAIL  ${name}: ${err.message.split('\n')[0]}`);
    throw err;
  }
}

const stack = await startStack({ mode: 'real' });
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: browserPath(), headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(15000);
const consoleErrors = [];
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));

const toast = (text) => page.getByRole('status').filter({ hasText: text }).first().waitFor();
async function signInAs(role) {
  await page.goto(`${WEB}/login`);
  const out = page.getByRole('button', { name: 'Sign out' });
  if (await out.isVisible().catch(() => false)) {
    await out.click();
    await page.goto(`${WEB}/login`);
  }
  await page.getByRole('button', { name: `Try as ${role}` }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}
async function signOut() {
  const out = page.getByRole('button', { name: 'Sign out' });
  if (!(await out.isVisible().catch(() => false)))
    await page.getByRole('button', { name: 'Menu' }).click();
  await out.click();
}

let failed = false;
try {
  await step('home loads, the loom intro can be skipped, the headline prints', async () => {
    await page.goto(WEB);
    await page
      .getByRole('button', { name: 'Skip the loom' })
      .click({ timeout: 4000 })
      .catch(() => {});
    await page.getByRole('heading', { level: 1, name: /Hear the hands/ }).waitFor();
    await page.getByText('Six crafts, slowly losing their colour').waitFor();
    const n = await page.locator('svg[data-variant="fade"]').count();
    if (n !== 6) throw new Error(`expected 6 fading crafts, saw ${n}`);
    return 'six fading crafts from the real /craft-types';
  });

  await step('artisan creates a story, uploads audio, runs AI and submits it', async () => {
    await signInAs('artisan');
    await page.getByRole('link', { name: 'Record a new story' }).click();
    await page.getByLabel(/^Title/).fill(STORY);
    await page.getByRole('combobox', { name: /^Language/ }).selectOption('en');
    await page
      .getByLabel(/^Written version/)
      .fill(
        'My husband built our first lathe from an old cycle wheel. It still runs. Every toy in this house came off it.',
      );
    await page.getByRole('button', { name: 'Start this story' }).click();
    await page.waitForURL(/\/dashboard\/artisan\/stories\/[0-9a-f]{24}$/);
    await page.getByLabel('Or upload a recording').setInputFiles({
      name: 'story.wav',
      mimeType: 'audio/wav',
      buffer: Buffer.from(synthHumWav('smoke', 4)),
    });
    await toast('Recording saved.');
    await page.getByRole('button', { name: 'Process with AI' }).click();
    await toast('Transcript and translation are ready to check.');
    const lines = await page.getByLabel(/^Line \d/).count();
    if (lines < 3) throw new Error(`expected transcript lines, saw ${lines}`);
    await page.getByRole('button', { name: 'Send for review' }).click();
    await toast('Sent to the review desk.');
    return `${lines / 2} transcript lines`;
  });

  await step('reviewer approves it from the queue', async () => {
    await signOut();
    await signInAs('reviewer');
    await page.getByRole('link', { name: STORY, exact: true }).click();
    await page.getByRole('heading', { name: 'Original and translation' }).waitFor();
    await page.getByRole('button', { name: 'Approve as it is' }).click();
    await toast('Approved. It is now in the archive.');
  });

  await step('the story is in the public archive and plays only when asked', async () => {
    await page.goto(`${WEB}/archive`);
    await page.getByLabel('Search the stories').fill('cycle-wheel lathe');
    await page.getByRole('button', { name: 'Search' }).first().click();
    await page.getByRole('link', { name: STORY, exact: true }).click();
    await page.getByRole('heading', { level: 1, name: STORY }).waitFor();
    const playing = await page.evaluate(() =>
      [...document.querySelectorAll('audio')].some((a) => !a.paused),
    );
    if (playing) throw new Error('audio started without a click');
    const before = await page.evaluate(() => document.querySelector('audio')?.getAttribute('src'));
    await page.getByRole('button', { name: 'Play' }).click();
    const src = await page.evaluate(() => document.querySelector('audio')?.getAttribute('src'));
    if (before || !src?.includes('/uploads/audio/'))
      throw new Error(`unexpected audio src ${before} / ${src}`);
    return 'src set only on Play, served from the API';
  });

  await step('buyer sends an enquiry, artisan answers it', async () => {
    await signOut();
    await signInAs('buyer');
    await page.goto(`${WEB}/artisans/${oid('a2', 1)}?craft=${oid('a3', 1)}`);
    const form = page.locator('section', {
      has: page.getByRole('heading', { name: /Write to Kempamma/ }),
    });
    await form.getByLabel(/^Subject/).fill('Smoke test horses');
    await form
      .getByLabel(/^Your message/)
      .fill('Could you make six small rocking horses by next month?');
    await form.getByRole('button', { name: 'Send enquiry' }).click();
    await form.getByText('Sent to Kempamma.').waitFor();
    await signOut();
    await signInAs('artisan');
    await page.goto(`${WEB}/dashboard/artisan/enquiries`);
    const item = page.locator('li', { hasText: 'Smoke test horses' }).first();
    await item.getByRole('button', { name: /Open letter/ }).click();
    await item.getByLabel(/^Your reply/).fill('Yes, six horses in four weeks.');
    await item.getByRole('button', { name: 'Send reply' }).click();
    await toast('Reply sent.');
  });

  let code;
  await step(
    'artisan posts an opening, learner applies, artisan accepts and completes',
    async () => {
      await page.goto(`${WEB}/dashboard/artisan/openings`);
      await page.getByRole('button', { name: 'Post an opening' }).click();
      await page.getByLabel(/^Title/).fill(OPENING);
      await page.getByLabel(/^Where/).fill('Kalanagara, Ramanagara');
      await page
        .getByLabel(/^What the apprentice will do/)
        .fill('Turn ten tops on the lathe and colour them with lac.');
      await page.getByRole('button', { name: 'Post opening' }).click();
      await toast('Opening posted.');
      const href = await page
        .getByRole('link', { name: OPENING, exact: true })
        .getAttribute('href');
      await signOut();
      await signInAs('learner');
      await page.goto(`${WEB}${href}`);
      await page
        .getByLabel(/^Why this craft/)
        .fill('I want to learn to turn wood and mix lac colours properly.');
      await page.getByRole('button', { name: 'Send application' }).click();
      await page.getByText('Application sent.').waitFor();
      await signOut();
      await signInAs('artisan');
      await page.goto(`${WEB}/dashboard/artisan/openings`);
      const row = page
        .locator('li', { has: page.getByRole('link', { name: OPENING, exact: true }) })
        .first();
      await row.getByRole('button', { name: 'Show applicants' }).click();
      await row.getByRole('button', { name: 'Accept' }).click();
      await toast('Meera Hegde accepted.');
      await row.getByRole('button', { name: 'Mark complete' }).click();
      const t = page
        .getByRole('status')
        .filter({ hasText: /Certificate VT-/ })
        .first();
      await t.waitFor();
      code = (await t.textContent()).match(/VT-[A-Z0-9]{4}-[A-Z0-9]{4}/)[0];
      return code;
    },
  );

  await step('anyone can verify the new certificate', async () => {
    await page.goto(`${WEB}/verify/${code}`);
    await page.getByText('This certificate is genuine.').waitFor();
    await page.getByText('Meera Hegde').first().waitFor();
  });

  await step(
    'admin pauses a user, who is rejected on the next request; then reactivates',
    async () => {
      const ctx2 = await browser.newContext({ viewport: { width: 1000, height: 800 } });
      const buyer = await ctx2.newPage();
      await buyer.goto(`${WEB}/login`);
      await buyer.getByRole('button', { name: 'Try as buyer' }).click();
      await buyer.waitForURL(/dashboard\/buyer/);
      await signOut();
      await signInAs('admin');
      await page.goto(`${WEB}/admin/users`);
      await page.getByRole('combobox', { name: 'Role', exact: true }).selectOption('buyer');
      const row = page.getByRole('row', { name: /Ananya Rao/ });
      await row.getByRole('button', { name: /Pause/ }).click();
      await toast('Ananya Rao is paused and signed out everywhere.');
      await buyer.reload();
      await buyer.waitForURL(/\/login/);
      await buyer.getByText('Your account has been paused').waitFor();
      await row.getByRole('button', { name: /Reactivate/ }).click();
      await toast('Ananya Rao can sign in again.');
      await ctx2.close();
      return 'paused buyer bounced to /login with a notice';
    },
  );

  await step('admin changes a role, resolves a report and reads the audit log', async () => {
    await page.getByRole('combobox', { name: 'Role', exact: true }).selectOption('learner');
    const row = page.getByRole('row', { name: /Arjun Patil/ });
    await row.getByLabel('Role for Arjun Patil').selectOption('buyer');
    await row.getByRole('button', { name: 'Save role' }).click();
    await toast('Arjun Patil is now a buyer.');
    await page.goto(`${WEB}/admin/moderation`);
    await page.getByRole('button', { name: 'Dismiss' }).first().click();
    await toast('Report dismissed.');
    await page.goto(`${WEB}/admin/audit`);
    for (const text of [
      'Paused Ananya Rao',
      'Reactivated Ananya Rao',
      'Changed Arjun Patil from learner to buyer',
      'Dismissed a report',
    ])
      await page
        .getByRole('cell', { name: new RegExp(text) })
        .first()
        .waitFor();
  });

  await step('admin impact dashboard shows SDG groups, charts and data tables', async () => {
    await page.goto(`${WEB}/admin`);
    for (const g of [
      'Decent work and economic growth',
      'Safeguarding cultural heritage',
      'Quality education',
    ])
      await page.getByRole('heading', { name: g }).waitFor();
    await page.locator('svg.recharts-surface').first().waitFor();
    const charts = await page.locator('svg.recharts-surface').count();
    const tables = await page.locator('.visually-hidden > table').count();
    if (charts < 6 || tables < 6) throw new Error(`charts ${charts}, tables ${tables}`);
    return `${charts} charts, ${tables} hidden data tables`;
  });

  await step('language choice persists across reloads', async () => {
    await page.goto(WEB);
    await page
      .getByRole('button', { name: 'Skip the loom' })
      .click({ timeout: 3000 })
      .catch(() => {});
    await page.getByRole('button', { name: 'ಕನ್ನಡ' }).first().click();
    await page.getByRole('heading', { level: 1, name: /ಕೈಗಳು ಮೌನವಾಗುವ ಮುನ್ನ/ }).waitFor();
    await page.reload();
    await page.getByRole('heading', { level: 1, name: /ಕೈಗಳು ಮೌನವಾಗುವ ಮುನ್ನ/ }).waitFor();
    const lang = await page.evaluate(() => document.documentElement.lang);
    if (lang !== 'kn') throw new Error(`html lang is ${lang}`);
    await page.getByRole('button', { name: 'English' }).first().click();
    return 'html lang="kn" after reload';
  });
} catch {
  failed = true;
} finally {
  await browser.close();
  stack.stop();
}

const relevantErrors = consoleErrors.filter(
  (e) => !/favicon|fonts\.g|ERR_INTERNET|net::ERR/.test(e),
);
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} steps passed.`);
if (relevantErrors.length)
  console.log(`Console errors seen:\n- ${relevantErrors.slice(0, 10).join('\n- ')}`);
process.exit(failed ? 1 : 0);
