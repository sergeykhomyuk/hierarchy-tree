# Verification profile

Browser UI (React + Vite, deployed to Cloudflare Pages). This file is the repository's
verification profile: what to run locally, what "passing" means, and where evidence for a
loop's proof document comes from. It is authored in `specs/phase-1-setup/` milestone 1;
milestone 6 adds the `production-hostname` marker below once the Cloudflare Pages project
exists.

## Environment

- Node `24.15.0`, pinned in `.nvmrc` and mirrored in `package.json`'s `engines.node`. CI
  reads the same file (`actions/setup-node` with `node-version-file: .nvmrc`), so a version
  drift between CI and local development is a visible failure rather than a silent one.
- `npm ci` installs dependencies from the committed lockfile.

## Commands

- `npm run dev` - Vite dev server, default port `5173`.
- `npm run build` - `tsc -b && vite build`; the build runs the typecheck, so a type error
  fails the build rather than only `npm run typecheck`.
- `npm run preview` - serves the built `dist/` locally, same server Playwright's `deployed`
  and `development` webServer configurations use.
- `npm run typecheck` - `tsc -b` across every TypeScript project (`tsconfig.app.json`,
  `tsconfig.node.json`, `tsconfig.tools.json`), so app code, config files and tests outside
  `src` are all type-checked, not only the app.
- `npm run lint` - ESLint plus the two source-only guard scripts
  (`assert-no-physical-properties.mjs`, `assert-no-secrets.mjs --source-only`).
- `npm run format:check` - Prettier, `--check` mode.
- `npm run test` - `vitest run`, the full unit/component suite across the jsdom, platform
  and ui Vitest projects.
- `npm run test:coverage` - the same suite with coverage thresholds enforced (85% lines,
  branches and functions repository-wide; 100% for `src/features/*/domain` once a domain
  module exists).
- `npm run verify:build` - Vitest run against `vitest.build-output.config.ts`: assertions
  that read the built `dist/` (base path, bundle secrets scan, route/catalogue chunk
  graph, kit-route absence, SPA fallback and header files, size-limit entry parity). Runs
  only after `npm run build`, and fails rather than skips when `dist/` is missing.
- `npm run size` - `size-limit` against `.size-limit.json`.
- `npm run verify` - the seven CI "verify job" gating scripts chained with `&&`, in
  invariant 103's order: `typecheck && lint && format:check && test:coverage && build &&
verify:build && size`. **Does not include `e2e`** - e2e is the CI verify job's eighth
  and final gating step, run separately (`npm run e2e`) because it needs the artifact
  `verify:build`/`size` just inspected already served, not rebuilt.
- `npm run e2e` - Playwright, against the production preview build (`vite preview`, no
  rebuild) unless `DEPLOYED_BASE_URL` is set, in which case it runs against that URL
  instead with no local `webServer`.
- `npm run e2e:deployed` - `playwright test --project=deployed`, against the live
  production hostname recorded in `deployment.json`. Only meaningful after a merge to
  `main` has deployed.
- `npm run smoke:live` - `vitest run --config vitest.live.config.ts`, a manually triggered
  probe of the real backend (`workflow_dispatch` only in CI; never part of `verify`).

## What "e2e" means here

Playwright browser flows against a built, served `dist/` (never the dev server) - so what
is verified is the artifact CI ships, not a dev-mode approximation. The flows that matter
for this phase, added milestone by milestone as the surfaces they exercise land: both
placeholder routes reachable and keyboard-navigable, the not-found route, a forced route
error recovering via the error boundary with a visible correlation id, the telemetry
buffer sink assertions, a clean browser console on every flow, an axe scan per route, empty
storage after a run, and the development-only kit route at 320px with axe in both real
light and real dark themes. `right-to-left.spec.ts` and `development-console.spec.ts` run
only in their own named Playwright projects; `deployed-smoke.spec.ts` only in the
`deployed` project, post-merge.

## Evidence

Evidence for a loop's proof document is copied into `specs/<task-id>/evidence/` with a **`.txt` extension**, never referenced
directly from Playwright's `test-results/` output directory - `test-results/` is cleared at
the start of every Playwright invocation, so anything not copied out is lost the next run.
`.gitignore`'s blanket `*.log` rule is why `.txt` is the convention rather than `.log`; a
`!specs/**/evidence/**` negation is also in place as a safety net.

Milestone boundaries land their own evidence under `specs/{phase}/evidence/milestones/`
as `m<N>-suite.txt` and `m<N>-e2e.txt`; step-level red/green evidence lands under
`specs/{phase}/evidence/steps/`.

<!-- production-hostname: https://hierarchy-tree.pages.dev -->

## Notes carried from specification

- Type-aware ESLint's runtime cost is measured once, in milestone 2, and recorded here so a
  later regression is visible rather than assumed.
- The entry+vendor size-limit budget was measured for the first time in phase 1's milestone 1,
  before later milestones added code on top of it. It is **150 kB gzipped**, not the 100 kB this
  file carried until 2026-08-14: wiring the real router measured the entry at 112.77 kB and the
  original estimate was revised with the user, per ARCHITECTURE.md's decision log. `.size-limit.json`
  is the authority; this line exists so a reviewer reading only the verification profile is not
  handed a contradictory number.
