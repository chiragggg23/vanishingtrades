// Lighthouse (mobile preset) on the production build of Home, served by `vite preview` and talking
// to the real API. Usage: PLAYWRIGHT_DIR=<dir with lighthouse + chrome-launcher> node scripts/lighthouse.mjs [runs]
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { WEB, browserPath, startStack } from './lib/stack.mjs';

const dir = process.env.PLAYWRIGHT_DIR;
const req = createRequire(join(dir, 'package.json'));
const lighthouse = (await import(pathToFileURL(req.resolve('lighthouse')).href)).default;
const chromeLauncher = await import(pathToFileURL(req.resolve('chrome-launcher')).href);
const runs = Number(process.argv[2]) || 3;

const stack = await startStack({ mode: 'real' });
const chrome = await chromeLauncher.launch({
  chromePath: browserPath(),
  chromeFlags: ['--headless=new', '--no-first-run', '--disable-gpu'],
});
const scores = [];
try {
  for (let i = 0; i < runs; i++) {
    const { lhr } = await lighthouse(`${WEB}/`, {
      port: chrome.port,
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices'],
      formFactor: 'mobile',
      screenEmulation: {
        mobile: true,
        width: 412,
        height: 823,
        deviceScaleFactor: 1.75,
        disabled: false,
      },
    });
    const a = lhr.audits;
    const row = {
      performance: Math.round(lhr.categories.performance.score * 100),
      accessibility: Math.round(lhr.categories.accessibility.score * 100),
      bestPractices: Math.round(lhr.categories['best-practices'].score * 100),
      FCP: a['first-contentful-paint'].displayValue,
      LCP: a['largest-contentful-paint'].displayValue,
      TBT: a['total-blocking-time'].displayValue,
      CLS: a['cumulative-layout-shift'].displayValue,
      SI: a['speed-index'].displayValue,
    };
    scores.push(row);
    console.log(`run ${i + 1}:`, JSON.stringify(row));
    const failing = Object.values(lhr.audits)
      .filter(
        (x) =>
          x.score !== null &&
          x.score < 0.9 &&
          lhr.categories.accessibility.auditRefs.some((r) => r.id === x.id),
      )
      .map((x) => x.id);
    if (process.env.LH_DETAIL) {
      const mt = a['mainthread-work-breakdown'].details.items.map(
        (x) => `${x.groupLabel} ${Math.round(x.duration)}ms`,
      );
      const lt = (a['long-tasks']?.details?.items || [])
        .slice(0, 6)
        .map(
          (x) =>
            `${x.url?.split('/').pop() || '?'} @${Math.round(x.startTime)} ${Math.round(x.duration)}ms`,
        );
      console.log('  main thread:', mt.join(', '));
      console.log('  long tasks:', lt.join(' | '));
    }
    if (failing.length) console.log('  accessibility audits below 0.9:', failing.join(', '));
  }
} finally {
  await chrome.kill();
  stack.stop();
}
const median = (k) => scores.map((s) => s[k]).sort((x, y) => x - y)[Math.floor(scores.length / 2)];
console.log(
  `median performance ${median('performance')}, accessibility ${median('accessibility')}, best practices ${median('bestPractices')}`,
);
