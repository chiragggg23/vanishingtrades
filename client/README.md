# VanishingTrades client

React 18 + Vite, React Router, Axios, react-i18next (English, Kannada, Hindi), framer-motion (lazy
`LazyMotion` + `m`), Recharts (admin only, lazy). Custom CSS with tokens and CSS Modules; a small
own grid utility instead of Bootstrap.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173 with the in-browser mock (no server needed)
```

To use the real API, copy `.env.example` to `.env` and set:

```
VITE_USE_MOCK=false
VITE_API_URL=http://localhost:4000/api
```

| Script                                  | What it does                                                          |
| --------------------------------------- | --------------------------------------------------------------------- |
| `npm run dev`                           | Dev server                                                            |
| `npm run dev:real`                      | Dev server against the API on localhost:4000                          |
| `npm run build` / `npm run build:real`  | Production build (mock unless `VITE_USE_MOCK=false`) / real-API build |
| `npm run preview`                       | Serve `dist/` (always rebuild first)                                  |
| `npm test`                              | Vitest + Testing Library + jest-axe                                   |
| `npm run lint` / `npm run format:check` | ESLint 9 / Prettier                                                   |
| `npm run contrast`                      | WCAG contrast of every text/background pair                           |
| `npm run check:mock-bundle`             | Proves the real-API build has no mock code or seed data               |
| `npm run size`                          | Initial JavaScript, raw and gzipped (after a build)                   |
| `npm run translations:review`           | Regenerates `../TRANSLATIONS_TO_REVIEW.md`                            |

## How the mock switch works

`vite.config.js` injects `__VT_MOCK__` as a literal (`true` or `false`) with `define`. The only
place that reads it is `src/api/http.js`:

```js
if (__VT_MOCK__) { const { handle } = await import('../mock/server.js'); … }
```

In a real build the condition is the literal `false`, so the bundler removes the branch and the
mock never ships. Pages import only from `src/api` (an ESLint rule forbids importing `src/mock`).
In tests `__VT_MOCK__` is a runtime global, flipped with `vi.stubGlobal('__VT_MOCK__', false)`.

The mock (`src/mock/server.js`) answers with the same `{ status, body }` as Express, keeps its data
in memory plus `localStorage`, waits 300–700 ms per call and fails about 4% of reads with 503
(never `/auth/*`). Its validation, search, views, impact maths, sample AI and seed data are the
same modules the server uses (`../shared`).

## Where things are

```
src/
  api/          one module per area + http.js (Axios / mock switch, envelope, ApiError)
  mock/         the in-browser backend (router + localStorage store)
  i18n/         setup + locales/en.json, kn.json, hi.json (kn/hi load on demand)
  styles/       tokens.css, base.css (grain, type, focus, reduced motion), grid.css
  components/
    art/        CraftArt (seeded block prints) and workshop illustrations
    home/       loom intro, printed headline, hero art, fading crafts, story panels
    story/      StoryPlayer, StoryRecorder (lazy), Cassette, segment editor
    ui/         StampButton, TicketCard, SdgStamp, Divider, forms, pagination, scenes, badges
    layout/     Layout (transitions, focus), Header, Footer (colophon), DemoRibbon, ProtectedRoute
    dash/       dashboard shell, enquiry thread, image upload
  pages/        public pages + dashboard/ (artisan, learner, buyer, reviewer, admin)
  context/      AuthContext, ToastContext
  test/         Vitest suites
```

## Recording audio

`StoryRecorder` asks for the microphone with `getUserMedia`, records with `MediaRecorder` using the
first supported type (`audio/webm;codecs=opus`, then `audio/mp4` for Safari, then others), draws the
live level from a Web Audio `AnalyserNode`, measures duration without pauses, and lets the artisan
play the take back, record again, or keep it. Blocked, missing or busy microphones get a plain
message, and a file upload (and the written-story field) works everywhere. It is loaded only on the
story editor page.
