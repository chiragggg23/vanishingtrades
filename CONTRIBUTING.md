# Contributing

VanishingTrades is built by a team of three to four. These rules keep `main` deployable and the
history readable.

## Branches

- `main`: what is deployed. Only updated by merging `dev` at the end of a milestone.
- `dev`: integration branch. Everything lands here first.
- Feature branches from `dev`: `feat/<area>-<short-name>`, `fix/<area>-<short-name>`,
  `docs/<topic>`. Example: `feat/archive-player-keys`.
- Keep a branch to one piece of work, and rebase on `dev` before opening a pull request.

## Commits

Conventional Commits, in the imperative:

```
feat(archive): add keyboard controls to the story player
fix(server): reject paused users on every request
docs: explain Atlas setup in DEPLOY.md
test(parity): cover enquiry participants
chore: bump vite
```

Types we use: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`, `style`, `perf`.

## Pull requests

1. Run, in `client/` and `server/`: `npm run lint`, `npm run format:check`, `npm test`.
2. In `client/` also run `npm run build` and `npm run check:mock-bundle`.
3. If you change an endpoint, change `docs/API_CONTRACT.md`, the mock (`client/src/mock`) and the
   server in the same pull request, and extend `server/tests/parity.test.js`.
4. If you add a visible string, add it to all three locale files and run
   `npm run translations:review`.
5. One reviewer approves. The author merges.

## Who owns what (suggested split for four people)

| Person | Area |
| --- | --- |
| 1 | Client shell, design system, Home and public pages |
| 2 | Story pipeline: recorder, player, AI service, review desk |
| 3 | Server: models, auth, validation, parity tests |
| 4 | Dashboards, admin area, i18n, deployment |
