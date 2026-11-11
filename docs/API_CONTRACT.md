# VanishingTrades API contract

This file is the single source of truth. The in-browser mock (`client/src/mock`) and the Express server
(`server/src`) both implement exactly this, and `server/tests/parity.test.js` runs the same scenarios against
both and asserts identical status codes and response shapes. Field limits live in code once, in
`shared/validation.js`, and are copied into the tables below.

## Conventions

- Base path: `/api`. JSON in and out, except the two multipart upload endpoints.
- Envelope, always:
  - success: `{ "success": true, "data": ... }`
  - failure: `{ "success": false, "message": "Human sentence.", "code"?: "ACCOUNT_PAUSED", "errors"?: { "field.path": "message" } }`
- Auth: `Authorization: Bearer <token>`. Tokens are JWTs (24 h) on the server and opaque strings in the mock.
- Ids are 24-character hex strings exposed as `id` (never `_id`). Dates are ISO 8601 strings.
- Localized text: `{ "en": "...", "kn"?: "...", "hi"?: "..." }`. `en` is required wherever localized text is
  accepted.
- Paginated lists: `{ "items": [...], "pagination": { "page", "limit", "total", "totalPages" } }`.
  `page` ≥ 1 (default 1), `limit` 1..50 (default 12; values above 50 are clamped to 50). `totalPages` is at
  least 1.
- Text search `q`: split on whitespace; a record matches when **every** word appears (case-insensitive
  substring) in **at least one** of the listed fields. Empty `q` matches everything.
- Every sort ends with `id` as the tie-breaker, in the same direction as the first sort key
  (newest-first lists put the newest id first). Ids grow monotonically (ObjectId layout), so mock
  and server order ties identically.
- Status codes:

| Code | When                                                                                                      |
| ---- | --------------------------------------------------------------------------------------------------------- |
| 200  | OK (also for creates that return the existing record)                                                     |
| 201  | Created                                                                                                   |
| 400  | Malformed JSON body or unknown multipart field                                                            |
| 401  | No token / invalid / expired token (`message: "Please sign in."`)                                         |
| 403  | Signed in but wrong role, not the owner of something public, or paused (`code: "ACCOUNT_PAUSED"`)         |
| 404  | Not found, **and** records the caller may not know exist (other people's drafts, enquiries, applications) |
| 409  | State conflict (duplicate email, wrong lifecycle state, duplicate application)                            |
| 413  | Upload too large                                                                                          |
| 422  | Field validation failed: `errors` maps field paths to messages                                            |
| 429  | Rate limited                                                                                              |
| 503  | Mock only: simulated outage on some GET reads (never `/auth/me`)                                          |

- Paused users: every authenticated request from a paused user returns 403 `ACCOUNT_PAUSED`, checked against
  the database on each request (not cached in the token). Login for a paused user also returns 403.
- Check order on every endpoint, so mock and server fail the same way: 401 (no/invalid token) →
  403 paused → 403 role → 422 validation → 404 → 403 ownership → 409 state. (Multipart uploads add
  413 for oversize files right after the role check.)
- Role locks below are enforced on the server. "Owner" means the signed-in artisan whose profile owns the
  record.

## Shared shapes

```text
User        { id, name, email, role, active, preferredLang, createdAt }
PublicUser  { id, name }                       // never includes email
ArtisanRef  { id, name, village, district, craftType }
Artisan     { id, userId, name, craftType, village, district, bio: Localized, yearsOfPractice,
              languages: string[], avatarUrl|null, seed, featured, worksCount, storiesCount,
              createdAt, updatedAt }
Craft       { id, artisanId, artisan: ArtisanRef, title: Localized, craftType, description: Localized,
              materials: string[], priceMin|null, priceMax|null, imageUrl|null, seed, createdAt, updatedAt }
CraftType   { key, name: Localized, region, practitioners, practitionersNote, isSample: true, since }
Segment     { id, start: number|null, end: number|null, text }
Story       { id, artisanId, artisan: ArtisanRef, title, language: "kn"|"hi"|"en", craftType, text,
              audioUrl|null, audioIsSample, durationSec|null, transcript: Segment[], translation: Segment[],
              summary: { en }, tags: string[], ai: { provider, isSample, processedAt }|null,
              status: "draft"|"pending"|"approved"|"rejected", reviewNote|null, submittedAt|null,
              approvedAt|null, plays, createdAt, updatedAt }
ArchiveItem = Story without text, transcript, translation, reviewNote
Enquiry     { id, buyer: PublicUser, artisan: ArtisanRef, craft: { id, title: Localized }|null, subject,
              message, status: "open"|"answered"|"closed", replies: Reply[], createdAt, updatedAt }
Reply       { id, author: PublicUser, authorRole, message, createdAt }
Apprenticeship { id, artisanId, artisan: ArtisanRef, title, craftType, description, seats, durationWeeks,
              stipend|null, location, deadline, status: "open"|"closed", applicationsCount, createdAt,
              updatedAt }
Application { id, apprenticeshipId, apprenticeship: { id, title, craftType, artisanName, durationWeeks },
              learner: PublicUser, motivation,
              status: "applied"|"shortlisted"|"accepted"|"rejected"|"completed",
              roadmap: [{ id: "s1".."s5", key, done, doneAt|null }], certificateCode|null, createdAt,
              updatedAt }
ProgressEntry { id, applicationId, note, photoUrl|null, createdAt }
Certificate { code, learnerName, artisanName, craftType, apprenticeshipTitle, durationWeeks, issuedAt }
Flag        { id, targetType: "story"|"craft"|"artisan", targetId, targetLabel|null, reason,
              reporter: PublicUser, status: "open"|"resolved", resolution: "dismissed"|"removed"|null,
              resolvedAt|null, createdAt }
AuditEntry  { id, actor: PublicUser, action, targetType, targetId, details: object, createdAt }
```

Roadmap step keys, in order: `s1 tools`, `s2 materials`, `s3 technique`, `s4 first-piece`, `s5 showcase`.
Certificate codes: `VT-XXXX-XXXX` from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`.

Craft type keys: `channapatna`, `bidriware`, `ilkal`, `kinhal`, `rosewood-inlay`, `pottery`.
Districts used by the seed: Ramanagara, Bidar, Bagalkot, Koppal, Mysuru, Chamarajanagar, Dakshina Kannada.

## Field limits (from `shared/validation.js`)

| Field                           | Rule                                               |
| ------------------------------- | -------------------------------------------------- |
| user.name                       | string 2..80                                       |
| email                           | valid email, ≤120, stored lower-cased              |
| password                        | string 8..72                                       |
| register.role                   | `artisan` \| `learner` \| `buyer`                  |
| preferredLang                   | `en` \| `kn` \| `hi`                               |
| artisan.name                    | 2..80                                              |
| artisan.village / district      | 2..60                                              |
| artisan.bio.en                  | 0..600 (kn, hi also ≤600)                          |
| artisan.yearsOfPractice         | integer 0..90                                      |
| artisan.languages               | array ≤5 of `en`/`kn`/`hi`                         |
| avatarUrl / imageUrl / photoUrl | string ≤500, or null                               |
| craft.title.en                  | 3..80 (kn, hi ≤80)                                 |
| craft.description.en            | 10..1000 (kn, hi ≤1000)                            |
| craft.materials                 | array ≤8, each 2..40                               |
| craft.priceMin / priceMax       | integer 0..10,000,000 or null; priceMax ≥ priceMin |
| enquiry.subject                 | 3..120                                             |
| enquiry.message, reply.message  | 10..1000 / 1..1000                                 |
| story.title                     | 3..120                                             |
| story.language                  | `kn` \| `hi` \| `en`                               |
| story.text                      | 0..5000                                            |
| story.summary.en                | 0..600                                             |
| segment.text                    | 1..1000; ≤200 segments                             |
| story.tags                      | array ≤8, each 2..30                               |
| audio durationSec               | number 1..1800                                     |
| review note (reject)            | required 5..500                                    |
| review note (approve)           | optional ≤500                                      |
| apprenticeship.title            | 3..120                                             |
| apprenticeship.description      | 20..2000                                           |
| apprenticeship.seats            | integer 1..20                                      |
| apprenticeship.durationWeeks    | integer 1..104                                     |
| apprenticeship.stipend          | integer 0..100,000 or null                         |
| apprenticeship.location         | 2..120                                             |
| apprenticeship.deadline         | ISO date, must be in the future on create          |
| application.motivation          | 20..1000                                           |
| progress.note                   | 5..1000                                            |
| flag.reason                     | 5..500                                             |
| upload image                    | jpeg/png/webp/gif ≤5 MB → re-encoded JPEG ≤800 px  |
| upload audio                    | webm/mp4/m4a/ogg/mpeg/wav ≤10 MB                   |

Unknown body fields are ignored. Keys starting with `$` or containing `.` are stripped from bodies and queries
before validation (operator-injection guard).

---

## Auth

### POST /auth/login — public (rate-limited)

Body `{ email, password }`. → 200 `{ token, user: User }`.
Errors: 422 field errors; 401 `"Email or password is wrong."`; 403 `ACCOUNT_PAUSED`.

### POST /auth/register — public (rate-limited)

Body `{ name, email, password, role }` with role `artisan|learner|buyer`. Registering as artisan also creates
an empty Artisan profile (`craftType: "pottery"`, `village`/`district: "—"`, to be edited). → 201
`{ token, user }`. Errors: 422 (role `reviewer`/`admin` is a 422 on `role`); 409 `email` already registered.

### GET /auth/me — signed in

→ 200 `User`. 401 / 403 paused.

### POST /auth/logout — signed in

→ 200 `{ ok: true }`. Revokes **every** token the user holds: the server bumps the user's
`tokenVersion`, which is signed into each token, so any later request with one of them gets 401.
The client also forgets its token.

### PATCH /auth/me — signed in

Body `{ name?, preferredLang? }`. → 200 `User`. 422.

## Artisans

### GET /artisans — public

Query: `q` (name, village, district, bio.en), `craftType`, `district`, `sort` = `name` (default) |
`experience` (yearsOfPractice desc) | `newest` (createdAt desc), `page`, `limit`. → 200 paginated `Artisan`.

### GET /artisans/featured — public

→ 200 `Artisan[]` (featured ones, max 6, sorted by name).

### GET /artisans/me — artisan

→ 200 `Artisan`. 401, 403 non-artisan.

### PUT /artisans/me — artisan

Body `{ name, craftType, village, district, bio, yearsOfPractice, languages, avatarUrl }` (all optional,
validated when present). Also renames the denormalised artisan fields on the artisan's crafts, stories and
apprenticeships. → 200 `Artisan`. 422.

### GET /artisans/:id — public

→ 200 `Artisan & { crafts: Craft[] (newest first), stories: ArchiveItem[] (approved, newest first),
apprenticeships: Apprenticeship[] (open) }`. 404.

## Crafts

### GET /crafts — public (the gallery)

Query: `q` (title.en, title.kn, title.hi, description.en, materials, artisan name), `craftType`,
`district`, `minPrice` (priceMax ≥ minPrice), `maxPrice` (priceMin ≤ maxPrice), `sort` = `newest` (default) |
`oldest` | `price-asc` (priceMin asc, nulls last) | `price-desc` (priceMax desc, nulls last) | `title`
(title.en asc), `page`, `limit`. → 200 paginated `Craft`.

### GET /craft-types — public

→ 200 `CraftType[]` (six, fixed order as listed above). Practitioner counts are illustrative and always
`isSample: true`.

### GET /crafts/mine — artisan

→ 200 `Craft[]` newest first.

### POST /crafts — artisan

Body `{ title, craftType, description, materials?, priceMin?, priceMax?, imageUrl? }`. → 201 `Craft`. 422.

### GET /crafts/:id — public → 200 `Craft`. 404.

### PUT /crafts/:id — artisan owner

Same body as POST, all optional. → 200 `Craft`. 403 if another artisan; 403 for non-artisans; 404; 422.

### DELETE /crafts/:id — artisan owner, or admin (take-down, audited as `craft.remove`)

→ 200 `{ id }`. 403, 404.

## Enquiries (SDG 8)

### POST /enquiries — buyer

Body `{ artisanId, craftId?, subject, message }`. `craftId`, when given, must belong to the artisan (422 on
`craftId`). → 201 `Enquiry`. 404 artisan not found.

### GET /enquiries — buyer (own), artisan (received), admin (all)

Query `status?`, `page`, `limit`. Sorted by updatedAt desc. → 200 paginated `Enquiry`. 403 learner/reviewer.

### GET /enquiries/:id — participants or admin → 200 `Enquiry`. 404 for everyone else.

### POST /enquiries/:id/replies — participants (buyer or artisan of that enquiry)

Body `{ message }`. An artisan reply sets status `answered`; a buyer reply sets it back to `open`. Replying
to a closed enquiry → 409. → 201 `Enquiry`. 404 non-participants (admin gets 403).

### PATCH /enquiries/:id/status — participants

Body `{ status: "open"|"closed" }`. → 200 `Enquiry`. 404 non-participants, 422.

## Stories

Lifecycle: `draft → pending → approved | rejected`; `rejected` can be edited and resubmitted (→ `pending`).
Editing, audio upload, AI processing and deletion by the owner are allowed only in `draft` or `rejected`
(409 otherwise).

### GET /stories/mine — artisan → 200 `Story[]` updatedAt desc.

### POST /stories — artisan

Body `{ title, language, craftType?, text? }`. `craftType` defaults to the artisan's. → 201 `Story` (draft).

### GET /stories/:id — owner, reviewer, admin → 200 `Story`. 404 for anyone else (also signed-out).

### PUT /stories/:id — owner

Body `{ title?, language?, craftType?, text?, transcript?, translation?, summary?, tags? }`. Segments are
`{ start?, end?, text }`; ids are (re)assigned `seg-1..n`. → 200 `Story`. 409 wrong state, 422.

### POST /stories/:id/audio — owner (multipart, rate-limited)

Fields: `audio` (file), `durationSec`. → 200 `Story` with `audioUrl`, `audioIsSample: false`,
`durationSec`. 422 missing/unsupported file or bad duration, 413 too large, 409 wrong state.

### POST /stories/:id/submit — owner

Requires a title and at least one transcript segment or non-empty `text` (422 on `transcript`).
→ 200 `Story` (`pending`, `submittedAt` set, `reviewNote` cleared). 409 unless draft/rejected.

### DELETE /stories/:id — owner (draft/rejected only, else 409), or admin any state (take-down, audited as

`story.remove`). → 200 `{ id }`.

## AI

### POST /ai/stories/:id/process — owner (rate-limited)

Needs audio or text (422 on `audio`). Runs speech-to-text (when audio), translation to English and a short
summary. Fills `transcript`, `translation`, `summary.en` and sets `ai = { provider, isSample, processedAt }`.
The mock provider is deterministic and always `isSample: true`; the real provider sets `isSample: false` and
falls back to the mock (with `isSample: true`) on failure or timeout (25 s). → 200 `Story`. 409, 404.

Mock provider rules (identical in browser mock and server): segments are the sentences of `text` (split
after `.`, `!`, `?`, `।`), or one canned sample sentence for the story language when only audio exists. With
audio, segment times split `durationSec` evenly (rounded to 0.1 s); without audio, times are `null`. English
translation of non-English segments is `"[Sample translation] " + text`; English stories copy the
transcript. Summary: `"Sample summary: " + first segment of translation`, cut to 600 characters.

## Review (reviewer, admin)

### GET /review/queue → 200 paginated `Story` (pending), submittedAt asc.

### GET /review/:storyId → 200 `Story` (any state except draft; draft → 404).

### POST /review/:storyId/approve

Body `{ edits?: { title?, transcript?, translation?, summary? }, note? }`. → 200 `Story` (`approved`,
`approvedAt`). 409 unless pending, 422.

### POST /review/:storyId/reject

Body `{ note }` (required 5..500). → 200 `Story` (`rejected`, `reviewNote`). 409 unless pending, 422.

## Archive (SDG 11.4, public)

### GET /archive

Query: `q` (title, summary.en, artisan name, transcript text, translation text), `language`, `craftType`,
`sort` = `newest` (approvedAt desc, default) | `oldest` | `most-played`, `page`, `limit`.
→ 200 paginated `ArchiveItem`.

### GET /archive/facets → 200 `{ languages: [{ key, count }], craftTypes: [{ key, count }] }` (approved only,

zero counts omitted, sorted by key).

### GET /archive/:id → 200 `Story` minus `reviewNote` (approved only, else 404).

### POST /archive/:id/play — public (rate-limited) → 200 `{ plays }`. 404.

## Apprenticeships (SDG 4)

### GET /apprenticeships — public

Query: `q` (title, description, location, artisan name), `craftType`, `status` (`open` default | `closed` |
`all`), `sort` = `deadline` (asc, default) | `newest`, `page`, `limit`. → 200 paginated `Apprenticeship`.

### GET /apprenticeships/mine — artisan → 200 `Apprenticeship[]` newest first.

### POST /apprenticeships — artisan

Body `{ title, craftType, description, seats, durationWeeks, stipend?, location, deadline }`. → 201. 422.

### GET /apprenticeships/:id — public → 200. 404.

### PUT /apprenticeships/:id — owner. Body as POST (optional) plus `status`. Deadline need not be in the future

on update. → 200. 403, 404, 422.

### DELETE /apprenticeships/:id — owner or admin (audited). Also deletes its applications. → 200 `{ id }`.

### GET /apprenticeships/:id/applications — owner or admin → 200 `Application[]` createdAt asc. 403, 404.

## Applications

### POST /applications — learner

Body `{ apprenticeshipId, motivation }`. → 201 `Application` (`applied`, five undone steps). 404 unknown
opening, 409 closed or past deadline (`message`), 409 already applied.

### GET /applications/mine — learner → 200 `Application[]` newest first.

### PATCH /applications/:id/status — artisan owner of the opening

Body `{ status: "shortlisted"|"accepted"|"rejected" }`. Allowed: applied→any of the three;
shortlisted→accepted|rejected. Otherwise 409. → 200. 404 if not the owner, 403 for non-artisans.

### POST /applications/:id/complete — artisan owner

Only from `accepted` (409). Issues a Certificate. → 200 `{ application, certificate }`.

### PATCH /applications/:id/roadmap/:stepId — learner owner

Body `{ done: boolean }`. Only while `accepted` (409). → 200 `Application`. 404 unknown step.

### GET /applications/:id/progress — learner owner or artisan owner → 200 `ProgressEntry[]` oldest first.

### POST /applications/:id/progress — learner owner

Body `{ note, photoUrl? }`. Only while `accepted` (409). → 201 `ProgressEntry`.

### GET /certificates/:code — public → 200 `Certificate`. 404.

## Impact

### GET /impact — public

```text
{ isSample, generatedAt,
  sdg8:  { artisans, works, enquiries, enquiriesAnswered },
  sdg11: { storiesArchived, languages, minutesRecorded, plays },
  sdg4:  { openings, applications, learnersInTraining, certificates } }
```

Counts are true counts of the data store. `isSample` is `true` while every user record is demo seed data,
and `false` as soon as one real (non-demo) account exists.

### GET /impact/dashboard — admin

`{ isSample, totals: <same as /impact without isSample/generatedAt>, series: { sdg8: [{ month, enquiries,
works }], sdg11: [{ month, submitted, approved }], sdg4: [{ month, applications, certificates }] },
breakdowns: { worksByCraft: [{ key, count }], storiesByLanguage: [{ key, count }], applicationsByStatus:
[{ key, count }] } }`. Series cover the last six calendar months (UTC, `YYYY-MM`, oldest first, including the
current month). Breakdown keys sorted, zero counts omitted.

## Flags and admin

### POST /flags — any signed-in user

Body `{ targetType, targetId, reason }`. 404 unknown target. → 201 `Flag`.

### GET /admin/users — admin. Query `q` (name, email), `role`, `active` (`true`/`false`), `page`, `limit`;

sorted by name. → 200 paginated `User`.

### PATCH /admin/users/:id/role — admin. Body `{ role }` (any of five). Own account → 409. Becoming an

artisan creates an empty profile if missing. Audited `user.role`. → 200 `User`.

### PATCH /admin/users/:id/active — admin. Body `{ active }`. Own account → 409. Audited

`user.pause` / `user.reactivate`. → 200 `User`.

### GET /admin/flags — admin. Query `status` (`open` default | `resolved` | `all`), `page`, `limit`; newest

first. → 200 paginated `Flag`.

### POST /admin/flags/:id/resolve — admin. Body `{ action: "dismiss"|"remove" }`. `remove` deletes the story

or craft, or pauses the artisan's account. Already resolved → 409. Audited `flag.dismiss` / `flag.remove`.
→ 200 `Flag`.

### GET /admin/audit — admin. Query `page`, `limit`; newest first. → 200 paginated `AuditEntry`.

## Uploads

### POST /uploads/image — signed in (multipart field `image`, rate-limited)

→ 201 `{ url }`. 422 missing/unsupported type, 413 over 5 MB. Images are re-encoded to JPEG, longest side
≤800 px, and stored on Cloudinary when `CLOUDINARY_*` is configured, otherwise on local disk under
`/uploads` (development only).

## Demo helpers (not part of the core contract)

### GET /demo — public → 200 `{ enabled, accounts: [{ role, email }] }`. `enabled` is true in the mock and when

the server runs with `DEMO_MODE=true`.

### POST /demo/reset — public, only when demo mode is enabled (else 404), rate-limited → 200 `{ ok: true }`.

Re-seeds the demo world.

## Demo world (seed, identical in mock and server)

12 artisans (two per craft), 24 works, 13 stories (kn/hi/en; 9 approved, 2 pending, 1 rejected, 1 draft),
6 apprenticeship openings, 4 enquiries, 5 applications (one completed with certificate `VT-7K3M-9QX2`),
3 open flags, and demo accounts `demo-<role>@vanishingtrades.test` / `demo1234` for all five roles. The demo
artisan account owns artisan profile 1 (Kempamma, Channapatna). Seed dates are relative to the moment of
seeding so the six-month charts always have data.
