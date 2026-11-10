# Decisions

One line each: the decision, then the reason.

## Structure and tooling

- Started from an empty folder (no earlier attempt existed in this workspace), so milestones 0 to 12 were built in order.
- A top-level `shared/` folder holds code both the mock and the server import (constants, validation, search, views, seed, mock AI, WAV synth, impact maths) so they cannot drift apart. Vercel and Render both clone the whole repo, so `client/` and `server/` can import `../shared`.
- No npm workspaces: `client/` and `server/` install separately, which keeps the Vercel root (`client`) and Render root (`server`) simple; `shared/` has no dependencies.
- Validation uses one dependency-free schema module in `shared/validation.js` instead of zod: the mock, the server and the client forms produce identical 422 field paths and messages, which the parity suite checks. zod would have needed a second, hand-synchronised copy of every rule.
- `cross-env` (client dev dependency) sets `VITE_USE_MOCK=false` for `npm run build:real` on Windows and Unix alike.
- `sharp` re-encodes uploaded images to JPEG at most 800 px; it is the standard fast image library for Node and ships prebuilt binaries.
- `cloudinary` SDK is only used when `CLOUDINARY_*` env vars exist; otherwise uploads go to `server/uploads`.
- Express 4 (not 5) because the async-handler pattern and middleware ecosystem are settled there.
- Vitest is used for both client and server tests so one runner covers the parity suite that imports client code.
- ESLint `jsx-a11y/label-has-associated-control` depth raised to 4, because our labels wrap their input with text in nested spans.

## API and data

- The mock is a router with the same `{ status, body }` result as Express, so the parity suite can call both with the same scenarios.
- `__VT_MOCK__` is injected with Vite `define`; one `if (__VT_MOCK__)` in `src/api/http.js` holds the only dynamic import of the mock, so every API function switches in one place and real builds drop the mock entirely.
- Seed ids are fixed 24-hex strings, so the same ids work as Mongo ObjectIds and mock ids; links in docs and tests stay stable.
- Seed dates are relative to the moment of seeding, so the six-month impact charts always have data.
- Every sort ends with `id` ascending, and string sorts compare by code unit (MongoDB's default binary collation), so mock and server order ties the same way.
- Paused accounts get `403` with `code: ACCOUNT_PAUSED` on every request (checked against the database each time, not the token); the client signs them out.
- Check order on every endpoint: 401, 403 (role), 422, 404, 403 (ownership), 409. Documented in the contract and followed by both implementations.
- `isSample` on impact numbers is true while every user record is demo seed data, false once one real account exists.
- Admin take-downs reuse `DELETE /stories/:id` and `DELETE /crafts/:id` (admin allowed) and write `story.remove` / `craft.remove` audit entries.
- Added `GET /demo` and `POST /demo/reset` (only with `DEMO_MODE=true`) so the login page knows when to show demo accounts and the ribbon can reset the seeded server too.
- Mock passwords are stored in plain text in the browser's localStorage. It is a demo store that never leaves the browser; the server always hashes with bcrypt.
- Mock recordings under 1.5 MB are kept as data URLs so they survive a reload; larger ones use object URLs and show "only lived in this browser" after a reload.

## Design

- The palette, fonts and texture are fixed by the brief. Indigo carries the primary role so the page does not read as the common cream-and-terracotta look; see `docs/DESIGN_PLAN.md`.
- Chart series colours are `#3B5C9E` (a lighter step of the indigo) and `#B8402E` (madder), validated for lightness, colour-blind separation and contrast against the panel paper.
- Gallery cards link to the artisan profile with the piece preselected in the enquiry form, rather than to a separate craft page: the enquiry is the point.
- The demo password is shown on the login page on purpose: it is a published test value for a demo deployment, and production seeding can turn demo accounts off.
