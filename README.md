# Hierarchy Tree

A small web app where a user logs in and views the full organizational hierarchy of a
company as a keyboard-accessible tree. Signing in is not real authentication - see
[Security](#security) below.

The goal, the architecture and the phase-by-phase plan are recorded under [`specs/`](./specs):
[`specs/GOAL.md`](./specs/GOAL.md) is the brief, [`specs/ARCHITECTURE.md`](./specs/ARCHITECTURE.md)
records every binding technical decision and its rationale, and
[`specs/ROADMAP.md`](./specs/ROADMAP.md) tracks what each phase built and how it proved it.
Each phase's own detailed spec, plan and evidence live under `specs/phase-<n>-<name>/`.

## Running it

- Node `24.15.0` (pinned in [`.nvmrc`](./.nvmrc); `nvm use` picks it up automatically).
- `npm ci` - installs dependencies from the committed lockfile.
- `npm run dev` - starts the Vite dev server at `http://localhost:5173`.
- `npm run build` && `npm run preview` - builds the production bundle and serves it locally.

Configuration defaults (API base URL, log level, request timeout, feature flags) are
documented in [`.env.example`](./.env.example); nothing in it is secret.

## Testing

- `npm run verify` - the full local gate: typecheck, lint, format check, unit/component
  tests with coverage, production build, built-output assertions, and size budgets. This
  is what CI's `verify` job runs.
- `npm run e2e` - Playwright against a built, served `dist/` (never the dev server).
- `npm run smoke:live` - a manually triggered probe of the real backend; stays outside
  `verify` because it depends on a third-party service being reachable.
- `npm run e2e:deployed` - runs the deployed-smoke Playwright project against the live
  production hostname; meaningful only after a merge to `main` has deployed.

See [`VERIFICATION.md`](./VERIFICATION.md) for the full command reference and what each
one is meant to prove.

## Deployment

Every push to `main` runs the CI workflow ([`.github/workflows/ci.yml`](./.github/workflows/ci.yml)):
the `verify` job's gates all have to pass before the `deploy` job publishes the built
`dist/` to Cloudflare Pages, and a `live-smoke` job proves the deployment against the
real backend afterward. [`deployment.json`](./deployment.json) records the project name
and the production hostname the deployed build is served from.

## Security

This app's "sign in" is a client-side lookup, not authentication: a value derived from
the email and password typed into the login form is looked up as a key in a public,
unauthenticated database. There is no server-side credential check, no session issued by
a backend, and no access control on the data itself - the database, plaintext passwords
included, is public and readable by anyone who has its URL, signed in or not. Treat this
as a demo of the login _flow_, never as a real authentication mechanism, and never enter
a password used anywhere else.
