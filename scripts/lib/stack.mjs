// Starts the real API (in-memory MongoDB, demo world) and the client built against it.
// Shared by the e2e smoke test and the screenshot/Lighthouse scripts.
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const ROOT = join(import.meta.dirname, '..', '..');
export const API_PORT = 4100;
export const WEB_PORT = 4173;
export const WEB = `http://localhost:${WEB_PORT}`;

/** playwright-core is a tool, not a project dependency: point PLAYWRIGHT_DIR at a folder that has it. */
export async function loadPlaywright() {
  const dir = process.env.PLAYWRIGHT_DIR;
  const req = createRequire(dir ? join(dir, 'package.json') : import.meta.url);
  return req('playwright-core');
}

export function browserPath() {
  const candidates = [
    process.env.BROWSER_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error('No Chrome/Edge found. Set BROWSER_PATH.');
  return found;
}

async function waitFor(url, ms = 90000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

/** mode: 'real' (client talks to the API) or 'mock' (in-browser mock, no API). */
export async function startStack({ mode = 'real', build = true } = {}) {
  const procs = [];
  if (mode === 'real') {
    const api = spawn(process.execPath, ['src/dev-memory.js'], {
      cwd: join(ROOT, 'server'),
      env: {
        ...process.env,
        PORT: String(API_PORT),
        NODE_ENV: 'development',
        DEMO_MODE: 'true',
        CORS_ORIGINS: WEB,
        RATE_LIMIT_DISABLED: 'true',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    api.stderr.on('data', (d) => process.env.STACK_DEBUG && process.stderr.write(d));
    procs.push(api);
    await waitFor(`http://localhost:${API_PORT}/health`);
  }
  if (build) {
    execSync('npx vite build --logLevel warn', {
      cwd: join(ROOT, 'client'),
      env: {
        ...process.env,
        VITE_USE_MOCK: mode === 'real' ? 'false' : 'true',
        VITE_API_URL: `http://localhost:${API_PORT}/api`,
      },
      stdio: 'inherit',
    });
  }
  const web = spawn(
    process.execPath,
    [
      join(ROOT, 'client/node_modules/vite/bin/vite.js'),
      'preview',
      '--port',
      String(WEB_PORT),
      '--strictPort',
    ],
    {
      cwd: join(ROOT, 'client'),
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  procs.push(web);
  await waitFor(WEB);
  return {
    stop() {
      for (const p of procs) {
        try {
          if (process.platform === 'win32')
            execSync(`taskkill /pid ${p.pid} /T /F`, { stdio: 'ignore' });
          else p.kill('SIGTERM');
        } catch {
          /* already gone */
        }
      }
    },
  };
}
