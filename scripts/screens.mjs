// Screenshots for the design critique, plus a horizontal-overflow check on every main page.
// Usage: PLAYWRIGHT_DIR=<dir with playwright-core> node scripts/screens.mjs <outDir> [--reduced] [--no-build]
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { oid } from '../shared/seed.js';
import { WEB, browserPath, loadPlaywright, startStack } from './lib/stack.mjs';

const out = process.argv[2] || 'artifacts/screens';
const reduced = process.argv.includes('--reduced');
mkdirSync(out, { recursive: true });

const stack = await startStack({ mode: 'real', build: !process.argv.includes('--no-build') });
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: browserPath(), headless: true });
const ctx = await browser.newContext({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
const page = await ctx.newPage();
page.setDefaultTimeout(20000);

async function settle() {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  // let printed words, fades and toasts finish
  await page.waitForTimeout(reduced ? 300 : 1600);
}
async function shoot(name, path, widths, before) {
  for (const w of widths) {
    await page.setViewportSize({ width: w, height: w < 500 ? 780 : 900 });
    await page.goto(`${WEB}${path}`);
    await page.evaluate(() => sessionStorage.setItem('vt-intro-seen', '1'));
    if (path === '/') await page.goto(`${WEB}/`);
    if (before) await before();
    await settle();
    // scroll through once so in-view effects (fading crafts) trigger, then back to the top
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(out, `${name}-${w}.png`), fullPage: true });
  }
}

const fontsOk = await (async () => {
  await page.goto(WEB);
  await settle();
  return page.evaluate(() => ({
    fraunces: document.fonts.check('700 40px Fraunces'),
    mukta: document.fonts.check('16px Mukta'),
    caveat: document.fonts.check('20px Caveat'),
  }));
})();
console.log('web fonts loaded:', JSON.stringify(fontsOk));

await shoot('home', '/', [360, 1280]);
if (reduced) {
  await shoot('story', `/archive/${oid('a4', 1)}`, [1280]);
} else {
  await shoot('gallery', '/gallery', [360, 1280]);
  await shoot('story', `/archive/${oid('a4', 1)}`, [360, 1280]);
  await shoot('artisan', `/artisans/${oid('a2', 3)}`, [1280]);
  await shoot('impact', '/impact', [1280]);
  await shoot('verify', '/verify/VT-7K3M-9QX2', [1280]);
  await shoot('notfound', '/nowhere', [360]);
  // Signed-in screens
  await page.goto(`${WEB}/login`);
  await page.getByRole('button', { name: 'Try as artisan' }).click();
  await page.waitForURL(/dashboard/);
  await shoot('dash-artisan', '/dashboard/artisan', [360, 1280]);
  await shoot('dash-editor', `/dashboard/artisan/stories/${oid('a4', 12)}`, [1280]);

  // Horizontal overflow at three widths on every main page (signed in as artisan for dashboards).
  const pages = [
    '/',
    '/gallery',
    '/archive',
    `/archive/${oid('a4', 1)}`,
    `/artisans/${oid('a2', 3)}`,
    '/apprenticeships',
    `/apprenticeships/${oid('a6', 1)}`,
    '/impact',
    '/verify/VT-7K3M-9QX2',
    '/register',
    '/nowhere',
    '/dashboard/artisan',
    '/dashboard/artisan/works',
    '/dashboard/artisan/enquiries',
    '/dashboard/artisan/openings',
    '/dashboard/artisan/profile',
    `/dashboard/artisan/stories/${oid('a4', 12)}`,
  ];
  const adminPages = [
    '/admin',
    '/admin/users',
    '/admin/moderation',
    '/admin/audit',
    '/dashboard/reviewer',
    `/dashboard/reviewer/${oid('a4', 6)}`,
  ];
  const learnerPages = ['/dashboard/learner'];
  const buyerPages = ['/dashboard/buyer'];
  const overflow = [];
  async function check(paths) {
    for (const w of [360, 768, 1440]) {
      await page.setViewportSize({ width: w, height: 900 });
      for (const p of paths) {
        await page.goto(`${WEB}${p}`);
        await settle();
        const o = await page.evaluate(() => ({
          sw: document.documentElement.scrollWidth,
          cw: document.documentElement.clientWidth,
          culprits: [...document.querySelectorAll('body *')]
            .filter(
              (el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1,
            )
            .slice(0, 4)
            .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`),
        }));
        if (o.sw > o.cw) overflow.push({ w, p, ...o });
      }
    }
  }
  await check(pages);
  for (const [role, list] of [
    ['admin', adminPages],
    ['learner', learnerPages],
    ['buyer', buyerPages],
  ]) {
    // sign out by forgetting the token (the menu may be folded at this width)
    await page.evaluate(() => localStorage.removeItem('vt-token'));
    await page.goto(`${WEB}/login`);
    await page.getByRole('button', { name: `Try as ${role}` }).click();
    await page.waitForURL(/dashboard|admin/);
    if (role === 'admin') await shoot('dash-admin', '/admin', [1280]);
    await check(list);
  }
  const checked = (pages.length + adminPages.length + learnerPages.length + buyerPages.length) * 3;
  console.log(
    `overflow check: ${checked} page/width combinations, ${overflow.length} with horizontal scroll`,
  );
  for (const o of overflow)
    console.log(`  ${o.w}px ${o.p}: scrollWidth ${o.sw} > ${o.cw}; ${o.culprits.join(', ')}`);
}
await browser.close();
stack.stop();
