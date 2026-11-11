import { safeNext } from '../lib/safeNext.js';

describe('safeNext (where to go after signing in)', () => {
  it('keeps plain in-app paths', () => {
    expect(safeNext('/dashboard/artisan')).toBe('/dashboard/artisan');
    expect(safeNext('/gallery?craftType=ilkal&page=2')).toBe('/gallery?craftType=ilkal&page=2');
    // percent-encoded characters stay inside the path, so they are harmless
    expect(safeNext('/archive?q=%0a')).toBe('/archive?q=%0a');
  });
  it('refuses anything that could leave the site', () => {
    const bad = [
      null,
      undefined,
      '',
      'dashboard',
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      '/\nfoo',
      'javascript:alert(1)',
    ];
    for (const b of bad) expect(safeNext(b), JSON.stringify(b)).toBeNull();
  });
});
