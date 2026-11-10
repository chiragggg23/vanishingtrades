import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { toHaveNoViolations } from 'jest-axe';
import { setMockOptions, resetDb } from '../mock/server.js';

expect.extend(toHaveNoViolations);

// In tests __VT_MOCK__ is a runtime global (not a Vite define), so tests can flip it with
// vi.stubGlobal('__VT_MOCK__', false).
globalThis.__VT_MOCK__ = true;
setMockOptions({ latency: false, failRate: 0 });

if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}
window.scrollTo = () => {};
if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = () => {};

// jsdom has no media playback: stub it so components can call play()/pause().
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: vi.fn(function play() {
    Object.defineProperty(this, 'paused', { configurable: true, value: false });
    this.dispatchEvent(new Event('play'));
    return Promise.resolve();
  }),
});
Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  value: vi.fn(function pause() {
    Object.defineProperty(this, 'paused', { configurable: true, value: true });
    this.dispatchEvent(new Event('pause'));
  }),
});
if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:test';
if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  resetDb();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  globalThis.__VT_MOCK__ = true;
});
