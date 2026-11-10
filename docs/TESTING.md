# Testing and measured results

All numbers below were produced on the build machine (Windows 11, Node 24, installed Google Chrome in headless mode) on
2026-11-10. Re-run the commands to reproduce them.

## Unit, component and accessibility tests (client)

`cd client && npm test`: **52 tests in 9 files, all passing.**

| File                      | Covers                                                                                                                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProtectedRoute.test.jsx` | signed out → `/login?next=…`, loading scene, wrong role → own dashboard, right role passes                                                                                                                                                                                |
| `forms.test.jsx`          | inline errors with `aria-invalid` and `aria-live`, API 409/422 mapped onto fields, sign-in failure, enquiry character counter and success                                                                                                                                 |
| `gallery.test.jsx`        | every filter, search, sort and page read from and written to the URL; empty scene                                                                                                                                                                                         |
| `api.test.js`             | `__VT_MOCK__` switch (mock vs Axios), envelope unwrap, one `ApiError` shape, network failure, bearer interceptor                                                                                                                                                          |
| `player.test.jsx`         | no autoplay, `preload="none"`, Space/K play-pause, ←/→ 5 s, M mute, first play counted once, segment highlight, original/English toggle, untimed segments                                                                                                                 |
| `a11y.test.jsx`           | jest-axe on 12 screens (Home, Gallery, Archive, StoryDetail, ArtisanProfile, Apprenticeships, Impact, Verify, Login, 404, artisan workbench, admin people table): **0 violations** (colour contrast is checked by `scripts/contrast.mjs` instead, as jsdom has no layout) |
| `headline.test.jsx`       | the printed headline keeps one clean accessible name                                                                                                                                                                                                                      |
| `units.test.js`           | recorder helpers (Safari mimeType, level meter, mic errors), shared validation, search, rules, seed counts, WAV synth, all i18n keys in 3 languages, contrast script                                                                                                      |

Test-only additions: `@testing-library/jest-dom`, `@testing-library/react`,
`@testing-library/user-event`, `jest-axe`, `jsdom`.

## Server tests

`cd server && npm test`: **26 tests in 2 files, all passing** (in-memory MongoDB, no setup).

- `parity.test.js`, 9 scenarios, each run against the browser mock **and** the Express server; every
  step's status code, full response shape (type of every field, array lengths) and selected values
  must match: login for all roles and failures; **401 and 403 on all 42 role-locked endpoints**
  with every wrong role (183 requests); gallery/artisans/archive/apprenticeships paging, filters,
  sorts and all-words search; craft CRUD with ownership 403; the whole story pipeline
  (create → audio → AI → edit → submit → reject → resubmit → approve with edits → archive → play);
  enquiries for participants only; apprenticeship apply → accept → roadmap → progress → complete →
  public certificate; impact totals and dashboard; admin role/pause/flags/audit.
- `server.test.js`, 17 tests: health and envelope, malformed/oversized bodies, helmet headers and
  CORS allow-list, bcrypt hashes never returned, expired/forged tokens and deleted users, refusal to
  start in production without `JWT_SECRET`, real rate limiting on sign-in (429 after 30), image
  re-encoding to JPEG ≤800 px, 413/422 upload limits, audio stored on disk, no learner emails on any
  public endpoint, AI mock / fallback / real-provider flag, seed counts and WAV files, demo-off mode.

### Mutation check (are the tests real?)

Each mutant was introduced by hand, the parity suite run, and the code restored:

| Mutant                                                            | Result                                                                                              |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Server: drop the admin role check on `GET /admin/users`           | **caught** ("GET /admin/users as artisan: expected 200 to be 403")                                  |
| Server: stop checking paused users on each request                | **caught**                                                                                          |
| Mock: drop the participant check on `PATCH /enquiries/:id/status` | **survived** at first, which exposed a gap; three non-participant steps were added, then **caught** |
| Server: same participant check removed                            | **caught**                                                                                          |

## End-to-end smoke test (real UI, real API)

`PLAYWRIGHT_DIR=<folder with playwright-core> node scripts/e2e-smoke.mjs`: **11/11 steps pass**,
no console errors. It builds the client with `VITE_USE_MOCK=false`, starts the API on an in-memory
MongoDB, and in headless Chrome: skips the intro and checks the six fading crafts; an artisan
creates a story, uploads a WAV, runs the AI step and submits; a reviewer approves it; it is found by
search in the archive, and audio gets a source only when Play is pressed; a buyer sends an enquiry
and the artisan answers; the artisan posts an opening, a learner applies, the artisan accepts and
completes; the new certificate verifies; an admin pauses the buyer (the buyer's open tab is bounced
to `/login` with the paused notice on its next request) and reactivates them, changes a role,
dismisses a report and finds all of it in the audit log; the SDG dashboard shows its charts and
hidden data tables; Kannada stays selected after a reload with `<html lang="kn">`.

## Layout, fonts, contrast

- No horizontal scroll: **0 of 75** checks (25 pages, public and every dashboard, at 360/768/1440 px)
  via `scripts/screens.mjs`.
- Fonts: Fraunces, Mukta and Caveat load (`document.fonts.check` true); on the Kannada and Hindi
  pages every character on screen is covered by Noto Sans Kannada / Mukta (checked per character).
- `npm run contrast`: all 26 text/background pairs pass WCAG AA (turmeric, madder and leaf on the
  darker paper are decoration-only, as in the brief).

## Lighthouse (Home, mobile preset, production build, real API on localhost)

`PLAYWRIGHT_DIR=<folder with lighthouse> node scripts/lighthouse.mjs 5`

| Run set               | Performance          | Accessibility        | Best practices |
| --------------------- | -------------------- | -------------------- | -------------- |
| Before fixes (3 runs) | 58–68, median 59     | 96–100               | 100            |
| Final code (7 runs)   | 76–89, **median 85** | **100 in every run** | 100            |

Final metrics: FCP 1.8–2.1 s, LCP 2.0–2.4 s, CLS 0–0.10, TBT 330–850 ms. The spread comes from
Total Blocking Time: one 300–470 ms task for the first style and layout pass, under Lighthouse's
4× CPU slowdown on a busy laptop. Caveats: Google Fonts were fetched live; the API ran on the same
machine, so network latency to Render/Atlas is not included.

## Bundle size

`npm run build:real && npm run size` (client): initial JavaScript for a first visit is
**143.0 KB gzipped** (3 files) for the real-backend build and 121.7 KB for the mock build.
Kannada and Hindi strings, every page, the recorder and Recharts load on demand.
`npm run check:mock-bundle`: the real-backend API bundle contains **0 of 6** seed markers (the mock
build contains all 6), so no mock code or demo data ships to production.
