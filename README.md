# VanishingTrades

A place to keep the endangered crafts of Karnataka alive: artisans record their stories by voice or
text, an AI step transcribes and translates them, a person reviews every line before it joins the
public archive, buyers write to artisans directly, and learners apply for apprenticeships that end
in a certificate anyone can check.

College project for **Full Stack Development (26CS3AEFSD)**, built around three UN Sustainable
Development Goals:

| Goal                                                 | In the product                                                               |
| ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| **SDG 8**, decent work and economic growth (primary) | artisan profiles, priced pieces, direct buyer enquiries                      |
| **SDG 11.4**, safeguarding cultural heritage         | the reviewed story archive in Kannada, Hindi and English                     |
| **SDG 4**, quality education                         | apprenticeships, a five-step roadmap, progress logs, verifiable certificates |

Roles: artisan, learner, buyer, reviewer, admin.

## Quick start

Requirements: Node 20+ and npm. MongoDB is optional for trying it out.

**Just the website, no server** (in-browser mock with the demo world):

```bash
cd client
npm install
npm run dev
```

Open <http://localhost:5173>, go to _Sign in_ and pick _Try as artisan_ (or any role).

**Website + real API + database**, without installing MongoDB:

```bash
cd server
npm install
npm run dev:memory
```

and in a second terminal:

```bash
cd client
npm install
npx cross-env VITE_USE_MOCK=false VITE_API_URL=http://localhost:4000/api npm run dev
```

With your own MongoDB or Atlas: copy `server/.env.example` to `server/.env`, set `MONGODB_URI`, then
`npm run seed` and `npm run dev` in `server/`.

Demo accounts (mock and seeded database): `demo-<role>@vanishingtrades.test` / `demo1234` for
`artisan`, `learner`, `buyer`, `reviewer`, `admin`.

## Tests

```bash
cd client && npm test       # 50 tests: components, URL filters, player keys, API switch, jest-axe
cd server && npm test       # 26 tests: contract parity (mock vs server), security, uploads, AI, seed
```

Results, the mutation check, the end-to-end run, Lighthouse and bundle sizes are in
[`docs/TESTING.md`](docs/TESTING.md).

## Repository

```
client/   React app (see client/README.md)
server/   Express API (see server/README.md)
shared/   code both use: validation, search, response shapes, impact maths, sample AI, seed world
docs/     API_CONTRACT.md (source of truth), DESIGN_PLAN.md, DESIGN_CRITIQUE.md, DECISIONS.md, TESTING.md
scripts/  e2e smoke test, screenshots + overflow check, Lighthouse (need playwright-core/lighthouse)
DEPLOY.md               Atlas + Render + Vercel, step by step
TRANSLATIONS_TO_REVIEW.md   every Kannada/Hindi string for a native speaker to check
render.yaml             Render blueprint for the API
CONTRIBUTING.md         branches, commits, pull requests for a team of 3–4
```

The browser scripts in `scripts/` need tools that are deliberately not project dependencies:
install `playwright-core` (and `lighthouse` for the Lighthouse script) in any folder and point
`PLAYWRIGHT_DIR` at it. They use your installed Chrome or Edge (set `BROWSER_PATH` otherwise).

## Honest notes

- Every artisan, story and number in the demo world is fictional; the crafts and places are real.
  Practitioner counts are illustrative and always labelled SAMPLE.
- Without an AI key the transcription and translation come from a deterministic sample provider and
  are labelled SAMPLE. With `AI_PROVIDER=groq` and a free Groq key they are real.
- The Kannada and Hindi text has not yet been checked by a native speaker.
