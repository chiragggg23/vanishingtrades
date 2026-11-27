# Deploying VanishingTrades (free tiers only)

Three pieces: **MongoDB Atlas M0** (database), **Render** free web service (API, from
`render.yaml`), **Vercel** (client). About 30 minutes the first time.

> Not yet done end to end: this guide was written against the providers' current dashboards but
> could not be run from the build machine (no accounts). Everything it deploys was verified
> locally: production builds, `npm start` with `NODE_ENV=production`, and the e2e smoke test
> against the real API. Check the steps marked **check** on your first deploy.

## 1. MongoDB Atlas (M0, free)

1. Create a free account at <https://www.mongodb.com/cloud/atlas> and a **M0** cluster (any region
   close to India, for example Mumbai `ap-south-1`).
2. **Database Access** → add a database user with a long generated password, role _Read and write
   to any database_.
3. **Network Access** → add `0.0.0.0/0` (Render's free tier has no fixed outbound IPs). The user
   password is what protects the database, so keep it long.
4. **Connect → Drivers** → copy the connection string and put a database name before the `?`:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/vanishingtrades?retryWrites=true&w=majority`

## 2. API on Render

1. Push the repository to GitHub.
2. In Render: **New → Blueprint**, pick the repo. Render reads `render.yaml` and creates
   `vanishingtrades-api` with `rootDir: server`. The blueprint generates `JWT_SECRET` for you.
3. Fill the variables marked _sync: false_:
   - `MONGODB_URI`: the Atlas string from step 1.
   - `CORS_ORIGINS`: your Vercel URL (you can add it after step 3; redeploy afterwards). Several
     origins are comma-separated. `http://localhost:5173` is always allowed for development.
   - Optional: `GROQ_API_KEY` with `AI_PROVIDER=groq` for real transcription and translation
     (free key at <https://console.groq.com>). Without it the AI step uses the sample provider and
     every result is labelled SAMPLE.
   - Optional: `CLOUDINARY_*` (free account at <https://cloudinary.com>). **Strongly recommended
     in production**: Render's free disk is wiped on every deploy and restart, so without
     Cloudinary uploaded photos and recordings disappear.
4. Deploy. The server refuses to start in production without `JWT_SECRET`.
5. Check `https://<your-service>.onrender.com/health` returns `{"success":true,"data":{"ok":true}}`.
   The free tier sleeps after 15 minutes idle; the first request after that takes about 30–60 s.

### Seeding

- **Demo deployment** (`DEMO_MODE=true`): on the first start with an empty database the server
  seeds the demo world by itself, including the five `demo-<role>@vanishingtrades.test` accounts
  (password `demo1234`). The login page shows "Try as …" buttons and the ribbon offers _Reset demo
  data_ (`POST /api/demo/reset`, rate-limited to 10 an hour).
- **Real deployment**: set `DEMO_MODE=false` and `SEED_DEMO_ACCOUNTS=false`, plus `ADMIN_EMAIL`
  and `ADMIN_PASSWORD` for your first admin. Then run the seed once from your machine against
  Atlas, so the sample crafts and stories exist but nobody can sign in with `demo1234`:

  ```bash
  cd server
  MONGODB_URI="mongodb+srv://..." SEED_DEMO_ACCOUNTS=false ADMIN_EMAIL=you@example.org ADMIN_PASSWORD='a long passphrase' NODE_ENV=production JWT_SECRET=x npm run seed
  ```

  `npm run seed` refuses to touch a database that already has users; `npm run seed:reset` wipes
  it first, so never run `seed:reset` against a database with real data. Remove `ADMIN_PASSWORD`
  from your shell history afterwards. Or skip seeding entirely and start from an empty database.

## 3. Client on Vercel

1. In Vercel: **Add New → Project**, import the repo.
2. **Root Directory**: `client`. Framework preset: Vite. Build command `npm run build`, output
   `dist` (also set in `client/vercel.json`).
3. **Check** that _Include source files outside of the Root Directory in the Build Step_ is
   enabled (Project Settings → General; it is on by default). The client imports `../shared`.
4. Environment variables (Production and Preview):
   - `VITE_USE_MOCK` = `false`
   - `VITE_API_URL` = `https://<your-service>.onrender.com/api`
5. Deploy. `vercel.json` rewrites every path to `index.html`, so refreshing `/archive/…` works.
6. Put the Vercel URL into `CORS_ORIGINS` on Render and redeploy the API.

**A demo without any backend**: deploy the client with `VITE_USE_MOCK=true` (the default). Every
visitor then gets the in-browser mock with the demo world saved in their own browser.

## 4. After deploying, check by hand

- `/` loads, the loom intro plays once per tab, the six crafts fill with colour as you scroll.
- `/login` → _Try as admin_ → `/admin` shows the three SDG groups with charts.
- Record a short story in Chrome and in Safari on a phone (microphone permission prompts work only
  over HTTPS, which Vercel provides).
- An uploaded photo still shows after the API restarts (only true with Cloudinary configured).

## Environment variables

| Where  | Variable                                                                | Required                     | Meaning                                                                |
| ------ | ----------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------- |
| API    | `MONGODB_URI`                                                           | yes                          | Atlas or local MongoDB connection string                               |
| API    | `JWT_SECRET`                                                            | yes in production            | Signs login tokens. Long and random.                                   |
| API    | `JWT_EXPIRES_IN`                                                        | no (24h)                     | Token lifetime                                                         |
| API    | `CORS_ORIGINS`                                                          | yes in production            | Comma-separated allowed browser origins                                |
| API    | `PORT`                                                                  | no (4000)                    | Render sets this itself                                                |
| API    | `DEMO_MODE`                                                             | no (true outside production) | Demo accounts on the login page, reset endpoint, self-seed on empty DB |
| API    | `SEED_DEMO_ACCOUNTS`                                                    | no (true)                    | false = seeded accounts get unusable passwords                         |
| API    | `ADMIN_EMAIL`, `ADMIN_PASSWORD`                                         | no                           | First real admin, created by `npm run seed` when demo accounts are off |
| API    | `AI_PROVIDER`                                                           | no (mock)                    | `mock` or `groq`                                                       |
| API    | `GROQ_API_KEY`, `GROQ_TEXT_MODEL`, `GROQ_SPEECH_MODEL`, `AI_TIMEOUT_MS` | no                           | Real AI provider                                                       |
| API    | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`  | no (recommended)             | Image and audio storage                                                |
| API    | `BCRYPT_ROUNDS`                                                         | no (10)                      | Password hashing cost                                                  |
| API    | `RATE_LIMIT_DISABLED`                                                   | no (false)                   | Only for local testing                                                 |
| Client | `VITE_USE_MOCK`                                                         | yes                          | `false` to use the API                                                 |
| Client | `VITE_API_URL`                                                          | when not mock                | API base URL ending in `/api`                                          |

## What is live now

Since 23 Nov 2026 the whole stack is online, on free tiers:

| Piece    | Where                                                                                      |
| -------- | ------------------------------------------------------------------------------------------ |
| Website  | <https://vanishingtrades.vercel.app> (Vercel)                                              |
| API      | <https://vanishingtrades-api.onrender.com/api> (Render, from `render.yaml`, branch `main`) |
| Database | MongoDB Atlas project `VanishingTrades`, free M0 cluster in Mumbai (ap-south-1)            |
| Code     | <https://github.com/chiragggg23/vanishingtrades>                                           |

Since 27 Nov 2026 the live site is a real installation, not a demo: `DEMO_MODE` and
`SEED_DEMO_ACCOUNTS` are `false` in `render.yaml`, so there is no demo ribbon, no "Try as" logins, no
reset endpoint and no automatic seeding. The database was emptied with `server/scripts/fresh-start.js`,
which also created the one admin account; everything else is entered through the site. Demo mode
still works locally (`npm run dev` in `client/`, or `npm run dev:memory` in `server/`).

To empty the live database again and recreate the admin (this deletes everything):

```bash
cd server
MONGODB_URI=<from server/.env.production.local> ADMIN_EMAIL=<email> ADMIN_PASSWORD=<password> \
  node scripts/fresh-start.js --yes
```

Render redeploys the API by itself on every push to `main`. The free plan sleeps after 15 minutes
without traffic, and the first request after that takes about a minute, so open the site shortly
before presenting.

The website is deployed as prebuilt files with the Vercel CLI, not from Git. To publish a new version:

```bash
cd client
VITE_USE_MOCK=false VITE_API_URL=https://vanishingtrades-api.onrender.com/api npx vite build
# copy dist/ into an empty folder named "vanishingtrades", add a vercel.json with the "rewrites" and
# "headers" from client/vercel.json (without buildCommand and outputDirectory), then inside it:
npx vercel deploy --prod --yes
```

The database password and the JWT secret live only in the Render dashboard and in the local,
git-ignored `server/.env.production.local`.
