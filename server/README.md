# VanishingTrades API

Node 20+, Express 4, MongoDB with Mongoose, JWT auth. Implements `docs/API_CONTRACT.md` exactly; the
parity suite proves it gives the same answers as the browser mock.

## Run it

```bash
npm install
cp .env.example .env        # then edit MONGODB_URI and JWT_SECRET
npm run seed                # load the demo world (refuses if the DB already has users)
npm run dev                 # http://localhost:4000/api, restarts on file changes
```

No MongoDB installed? `npm run dev:memory` starts the API on an in-memory MongoDB with the demo world
loaded (data is gone when it stops). The first run downloads a MongoDB binary (about 600 MB) into the
npm cache.

| Script                                  | What it does                                          |
| --------------------------------------- | ----------------------------------------------------- |
| `npm run dev`                           | API with `node --watch`                               |
| `npm start`                             | API for production                                    |
| `npm run dev:memory`                    | API on an in-memory MongoDB, seeded                   |
| `npm run seed`                          | Seed an empty database                                |
| `npm run seed:reset`                    | Wipe the database and seed again                      |
| `npm test`                              | All server tests (in-memory MongoDB, no setup needed) |
| `npm run lint` / `npm run format:check` | ESLint 9 / Prettier                                   |

## Local MongoDB or Atlas

- Local: install MongoDB Community Server and keep the default
  `MONGODB_URI=mongodb://127.0.0.1:27017/vanishingtrades`.
- Atlas (free M0): see `DEPLOY.md` §1 and paste the `mongodb+srv://…` string into `MONGODB_URI`.

## Environment

See `.env.example` and the table in `DEPLOY.md`. The essentials: `MONGODB_URI`, `JWT_SECRET`
(required in production; the server refuses to start without it), `CORS_ORIGINS`.

Without optional keys everything still works locally:

| Missing    | Fallback                                                                       | Switch on the real thing            |
| ---------- | ------------------------------------------------------------------------------ | ----------------------------------- |
| Cloudinary | files saved to `server/uploads`, served at `/uploads`                          | set `CLOUDINARY_*`                  |
| AI key     | deterministic sample provider (`ai.isSample: true`, labelled SAMPLE in the UI) | `AI_PROVIDER=groq` + `GROQ_API_KEY` |
| MongoDB    | `npm run dev:memory`                                                           | set `MONGODB_URI`                   |

## Structure

```
src/
  config/       env.js (validated settings), db.js
  models/       Mongoose models + indexes (User, Artisan, Craft, Story, Enquiry, Apprenticeship,
                Application, ProgressLog, Certificate, Flag, AuditLog)
  routes/       every endpoint: auth → role → validation → controller
  middleware/   auth (JWT, paused check per request), validate, upload (multer), limits, error
  controllers/  thin request/response glue
  services/     business rules; ai/ (provider interface: mock + Groq), storage (Cloudinary or disk)
  seed/         seedWorld.js (shared demo world → Mongo), run.js (npm run seed)
  utils/        envelope helpers, HttpError, lean-doc → plain conversion
tests/
  parity.test.js  the same scenarios against the browser mock and this server
  server.test.js  security, uploads, privacy, AI fallback, seeding, rate limits
```

Validation, search semantics, response serializers, the impact maths, the sample AI and the seed
data live in `../shared` and are imported by both this server and the browser mock.

## Security notes

- Passwords: bcrypt (cost 10). Tokens: JWT, 24 h, secret from env.
- Every authenticated request reloads the user, so a paused account is rejected on its next request
  (`403`, `code: ACCOUNT_PAUSED`).
- Role checks on the server for every role-locked endpoint (the parity suite tries every endpoint
  with every wrong role).
- helmet, CORS allow-list, JSON body limit 200 KB, multipart limits (image 5 MB, audio 10 MB),
  `$`/dotted keys stripped from bodies and queries, rate limits on `/auth`, uploads, `/ai` and
  `/archive/:id/play`.
- Learner emails never appear on public endpoints (tested).
