# Proof of completion: phase-1-setup

## Task

Phase 1 setup for hierarchy-tree: the four-layer architecture (app/features/shared/platform),
injected-capability platform adapters (HTTP, observability, internationalization, configuration,
runtime), a domain-free UI kit with WCAG AA tokens, the app shell (router, error boundaries,
CSP), and the CI/deploy pipeline to Cloudflare Pages. Delivered as an L-size loop across
PRODUCT.md's 135 numbered invariants, PLAN.md's six milestones and 38 TDD steps.

## Status: pre-merge PR, one obligation outstanding

This PR closes every step, milestone, and gate that can be closed before merge. It does **not**
close invariants 123, 124 and 126a, which PRODUCT.md and PLAN.md's own "post-merge obligation"
section define as provable only after a real deployment exists - no pull-request run produces a
production URL to test against (invariant 121 forbids preview deployments). Step 38
(`e2e/deployed-smoke.spec.ts`) is deliberately registered `red`, not `green`/`done`; milestone 6
and gates G2/G5 remain open for the same reason. See "The post-merge obligation" below.

## Requirements -> evidence, by milestone

### M1 - Toolchain, cruft removal and the verification harness (steps 1-8)

- Step 1 (117, 118): `.nvmrc`/`engines.node` pinning, `.gitignore` evidence-log fix. Tests: "node
  version is pinned consistently in .nvmrc and package.json engines", "evidence logs under specs
  are not excluded by .gitignore" (`scripts/repository-configuration.test.ts`).
- Step 2 (104, 105): `tsconfig.app.json` strictness, path aliases. Tests: "tsconfig.app.json
  enables strict and the four strictness flags", "path aliases resolve identically in tsconfig,
  Vite and Vitest".
- Step 3 (108, 109, 110, 115, 32, 21): Vitest projects, coverage thresholds, network-global
  stubbing. Tests: "coverage thresholds are configured at 85 for lines branches and functions",
  "the features domain 100 percent threshold is configured and inert while no such directory
  exists", "every Vitest project loads the setup file that makes a real fetch throw".
- Step 4 (113, 100, 115): `playwright.config.ts` conditional `webServer`/`projects`. Tests: "the
  deployed project is absent from the projects array when DEPLOYED_BASE_URL is unset", "no
  webServer is configured when DEPLOYED_BASE_URL is set".
- Step 5 (107): Tailwind v4 + Prettier ownership split. Test: "the Prettier config declares the
  tailwind stylesheet path".
- Step 6 (112, 89): `rolldownOptions.output`, `.size-limit.json`, empirically confirmed chunk
  naming. Tests: "the built entry and vendor chunks match their size-limit globs", "size-limit
  entries equal the declaration table expected set" (`build-output/`).
- Step 7 (131, 136): template cruft removed, `main.tsx`/bootstrap placeholder. Tests: "the Vite
  template files no longer exist", "the startup placeholder renders through bootstrap".
- Step 8 (102, 103, 112): npm scripts, `vitest.build-output.config.ts`, declaration table. Tests:
  "every gating npm script named by the workflow order exists in package.json", "the declaration
  table is internally valid at phase building".
- **Boundary**: `npm run verify` green end to end (typecheck, lint, format:check,
  test:coverage 100%, build, verify:build, size 59.4kB/100kB).
  Evidence: `evidence/milestones/m1-suite.txt`, `m1-e2e.txt`.
- **Review**: fresh-context `loop-reviewer`, 4 findings, 1 blocking (Claude-1: `npm test`
  triggered a live Vite build as a side effect - relocated the check to `build-output/`).
  Claude-3 (VERIFICATION.md e2e-scope overclaim) fixed; Claude-2, Claude-4 accepted as
  non-defects. Record: `evidence/reviews/m1-claude-review.md`.

### M2 - Layers and boundary enforcement (steps 9-14)

- Step 9 (1, 9): four layer directories, two feature entries. Test: "both feature entries exist
  and export their documented names".
- Step 10 (1-7, 12): `eslint-plugin-boundaries` element-types, `no-unknown(-files)`. Test: "the
  boundaries rules are configured at error severity".
- Step 11 (13, 21, 45, 45a, 128): the single-reader override, the network/storage bans in bare
  and member forms, the sinks-path ban. Tests: "the storage ban covers all five globals in bare
  and member forms", "the restricted-syntax rules are configured at error severity" - later
  extended in this PR's G4 fix round with "the network ban covers every enumerated identifier in
  bare and member forms" (closing a coverage gap for `globalThis.fetch` and `new Image().src`,
  see G4 below).
- Step 12 (105, 106, 90): jsx-a11y, i18next jsx-only mode, `testing-harness` override scope. Test:
  "the testing-harness override is scoped to test files and no wider".
- Step 13 (10, 11): six demonstrable negatives, each captured and reverted. Tests: "lint fails
  with the boundaries rule named on a cross-feature import", "lint fails with the
  restricted-import rule named on a deep feature import" (plus 4 more negatives captured under
  `evidence/negatives/`).
- Step 14 (8, 67, 20, 133): domain-vocabulary and physical-properties scripts, secret scan wired
  into lint. Tests: "the vocabulary script matches whole identifier segments and not substrings",
  "the physical-properties script rejects a physical-direction utility" - the secret-scan half of
  invariant 133 was substantially widened in this PR's G4 fix round (see Codex-61 below).
- **Boundary**: `npm run lint` green on the tree, demonstrably red on each injected violation
  with the rule named. Evidence: `evidence/milestones/m2-suite.txt`, `m2-e2e.txt`,
  `evidence/negatives/`.
- **Review**: fresh-context `loop-reviewer`, 6 findings, 3 blocking (missing
  `createObservability.ts` override, features override disabling the sinks ban too, a real
  `extractExportedIdentifiers` bug on aliased/default exports) - all fixed with regression tests.
  Claude-9 (over-broad single-reader overrides), Claude-10 (no test coverage for
  `assert-no-secrets.mjs`) also fixed. Claude-8 (interface/type member names uncheckable by the
  regex approach) accepted as a tracked residual limitation. Record:
  `evidence/reviews/m2-claude-review.md`.

### M3 - Platform adapters (steps 15-20)

- Step 15 (13-20): `platform/configuration` - single reader, frozen Zod-validated config, the
  error screen naming keys not values. Tests: "configuration is frozen and rejects a runtime
  write", "an invalid value is named in the message and its value is not", "createConfiguration
  succeeds with development-shaped defaults", "an invalid environment renders the error screen and
  does not render the router" - the error screen itself was substantially rebuilt in this PR's G4
  fix round (see Codex-60 below).
- Step 16 (21-35): `platform/http` - per-logical-request deadline, abort composition, cancelled
  as a sibling outcome, bounded retry, traceparent, one timing record per attempt. Tests: "the
  deadline covers the whole logical request and settles as timeout at the budget", "a caller
  abort yields cancelled without retrying or reporting an error", "a pre-aborted signal yields
  cancelled with no transport call", "the failure union is exhaustive without a default branch",
  "an error carries no response body content" - extended in this PR's G4 fix round with 5 more
  discriminating tests covering origin-escape rejection, deadline-during-parse, cancelled-attempt
  timing, and a retry-spanning deadline (see Codex-56, 59, 62, 63 below).
- Step 17 (45, 45a, 46, 48, 54-59): `platform/observability` - the three-key facade, the buffer
  handle, the bounded ring buffer, redaction before any sink. Tests: "the facade exposes exactly
  three keys", "the buffer handle is null unless the buffer sink is selected", "the ring buffer
  drops oldest and reads oldest-first after wrapping", "redaction removes matching keys at any
  depth including arrays cycles and url parameters", "a throwing property getter does not escape
  the facade".
- Step 18 (47, 47a, 30): interaction tracker, one correlation id per navigation. Tests: "a new
  correlation id is issued per navigation including the initial load", "a failed navigation emits
  no route_viewed".
- Step 19 (52, 53): `reportWebVitals`, silent degradation. Tests: "each web vital is reported once
  through the facade with its passed value", "an unsupported observer produces no throw no event
  and no console call".
- Step 20 (60-66): `platform/internationalization` - per-feature namespaces, missing-key
  handling, locale-to-direction map. Tests: "a missing key reports through the facade and renders
  the visible marker", "the locale direction map resolves without Intl.Locale".
- **Boundary**: `npm run verify` green (27 test files, 113 tests, 97.91% coverage). Per M3's own
  boundary note, no e2e is claimed - none is needed. Evidence: `evidence/milestones/m3-suite.txt`.
- **Review**: fresh-context `loop-reviewer` on diff `3875858..4077b8b`, 6 findings (Claude-11..16),
  1 blocking. All 6 fixed: injected correlation-id source (invariant 30/47 equality), bootstrap's
  configuration-failure path routed through the real facade, a malformed-log-level test added, a
  facade-wide try/catch around `startInteraction()`, a WeakSet cycle-guard fix in `redact.ts`
  (path-scoped, not globally-visited, so DAG-shared references redact correctly), and
  `appendNamespaceToMissingKey` enabled to match invariant 63's literal marker format. Re-verified:
  120 tests, 98.02% coverage, entry 66.08kB/100kB
  (`evidence/milestones/m3-suite-post-review.txt`).

### M4 - Tokens and the UI kit (steps 21-25)

- Step 21 (70, 71, 73, 75, 67): `theme.css` token layer, dark theme, logical properties, reduced
  motion. Tests: "no component references a raw color value instead of a token", "reduced motion
  disables every transition including the skeleton shimmer".
- Step 22 (72, 74): `contrastPairs.ts`, automated AA contrast in both themes. Tests: "every
  contrast pair holds AA in both themes", "every interactive element has a focus indicator
  meeting 3:1".
- Step 23 (69, 76-85): the eight kit components, literal-free, Button's busy-state
  `preventDefault`. Tests: "a busy button cannot submit its form by pointer or keyboard", "the
  field associates its label error and hint and communicates required", "the avatar falls back to
  initials when the image fails to load", "no kit component contains a user-visible literal".
- Step 24 (87): the state inventory, one axe assertion per state, no-orphan-component check.
  Tests: "every documented kit state has zero axe violations", "every exported kit component has
  a state in the inventory".
- Step 25 (86a, 76, 112): the `/__kit` route module behind the build-time flag, no inline `style`
  attribute. Tests: "the skeleton emits no style attribute", "size-limit entries equal the
  declaration table expected set".
- **Boundary**: `ui` Vitest project passes with axe assertions and the contrast test; does not
  claim the browser checks (M5's job). Evidence: `evidence/milestones/m4-suite.txt` (174 tests,
  98.34% coverage, entry 66.08/100kB, stylesheet 3.76/15kB).
- **Review**: fresh-context reviewer on diff `774e0f2..HEAD`, 6 findings (Claude-75..80), 1
  blocking (ErrorState's correlation-id text failed WCAG AA contrast, `contrastPairs.ts` was
  missing that pair) - fixed along with the worthwhile non-blocking findings, re-verified green.

### M5 - App shell (steps 26-32)

- Step 26 (90): `createRuntime`, `runtimeContext`, `useRuntime`, `ApplicationRoot`. Test: "a route
  rendered in a test goes through the real provider stack".
- Step 27 (88, 89, 94, 97, 98): router with `basename` from configuration, lazy route modules, no
  guard/redirect/fetch. Tests: "the router is created with basename taken from configuration
  rather than a literal", "an unmatched path renders the not-found route with a link home".
- Step 28 (95, 96, 96a, 132): both placeholder pages, kit components, one h1, axe clean. Test:
  "each placeholder exposes one h1 inside a main landmark and passes axe".
- Step 29 (91, 92, 93, 100): both error boundaries, `ErrorSurface`, `onCaughtError`/
  `onUncaughtError` routed to the facade. Tests: "the root boundary renders the error surface
  above any router without throwing", "the boundary reports the error exactly once and displays
  the correlation id".
- Step 30 (99, 99a, 101, 124): CSP plugin (no `frame-ancestors` in the meta tag),
  `public/_redirects`, `public/_headers`. Tests: "dist/_redirects contains exactly the spa
  fallback rule", "dist/_headers matches its exact expected content".
- Step 31 (62, 86b, 89, 103, 122): declaration table armed at `phase: 'complete'`, route/catalogue
  size entries. Tests: "the declaration table is complete and every family is declared at phase
  complete", "no dist file contains the kit route path, chunk, or state-inventory marker", "each
  route chunk imports only its own catalogue chunk".
- Step 32 (113, 49, 86, 86a, 87, 100, 128): full e2e suite plus the kit-route browser checks.
  Tests: "a forced route chunk failure renders the boundary with a correlation id and recovers on
  retry", "the buffer sink records exactly one route_viewed for the initial load and no
  redacted-key leakage", "local and session storage are empty after visiting both routes", "has
  zero axe violations in real dark".
- **Boundary**: `npm run verify` green (230 unit tests, 96%+ coverage, size-limit at the revised
  150kB entry budget - see the size-limit decision log in ARCHITECTURE.md/TECH.md/PRODUCT.md).
  `npm run e2e` green (16/16, later 17/17 after review fixes). `phase === 'complete'` recorded
  directly, arming `declaration-table.test.ts`'s fail-closed guard. Evidence:
  `evidence/steps/step26..32-{red,green}*.txt`.
- **Review**: fresh-context review (agent abb99bf439a474e95), 2 findings - Claude-81 (blocking,
  invariant 76/86a's skeleton-to-content box-equality measurement missing from
  `kit-route.spec.ts`) and Claude-82 (non-blocking, error-boundary retry was mouse- not
  keyboard-activated despite the claim). Both fixed; reviewer confirmed no layer-boundary
  violations, no cross-cutting regressions, and that the `/__kit` route's
  `import.meta.env.DEV` ESLint carve-out is sound against the real production build
  (`kit-route-absent.test.ts`).

### M6 - Pipeline and deploy (steps 33-38)

- Step 33 (102, 103, 114, 117, 120): `verify` job - seven gating steps in order, Playwright
  browser cache, the `site` artifact uploaded after `size` and before `e2e`, the report artifact
  with `if: always()`. Tests: "runs the seven gating steps in the documented order", "uploads the
  site artifact from dist/, only on main, before the e2e step", "uploads the Playwright report
  unconditionally, even on failure" (`scripts/workflow-configuration.test.ts`).
- Step 34 (120, 121, 123, 125): `deploy` job - `needs: verify`, push-to-main gate,
  `permissions: contents: read`, the concurrency group, sparse checkout of `deployment.json`,
  SHA-pinned wrangler action, deployment-URL assertion. Tests: "needs verify, runs only on push to
  main, and carries the smallest permission set", "has its own concurrency group so a newer
  deploy supersedes an in-flight one", "every non-actions/ uses: step is pinned by commit SHA, not
  a mutable tag", "checks out only deployment.json via sparse-checkout, and downloads the site
  artifact rather than rebuilding", "asserts the deployed URL equals the recorded production
  hostname".
- Step 35 (102, 135, 121): the workflow-parse test, no disabled tests. Tests: "every run: line in
  the verify job is a gating step, an npm script, or the named infrastructure allow-list", "no
  verify step skips itself with continue-on-error, if: false, or a skip flag", "runs only when
  manually dispatched, and blocks no merge", "src and e2e contain no .skip, .only, or test.fixme".
- Step 36 (123): `deployment.json`, the `production-hostname` markers, the doc-agreement test.
  Tests: "carries a project name and an https production hostname", "VERIFICATION.md carries the
  production-hostname marker, and its value agrees", ".env.example carries the
  production-hostname marker, and its value agrees". `deployment.json`:
  `{"projectName": "hierarchy-tree", "productionHostname": "https://hierarchy-tree.pages.dev"}`
  - confirmed as the real Cloudflare Pages project by the user directly (this Pages project, not
  a Workers domain).
- Step 37 (116, 116a, 116b): `live-smoke` job on `workflow_dispatch` only, outside every default
  Vitest project. Tests: "the live smoke test file is collected by no default vitest project",
  "the real backend serves users.json as JSON with at least one record", "the real backend serves
  secrets.json as JSON". Evidence: `evidence/live-smoke.txt` (2/2 against the real backend).
- Step 38 (123, 124, 126a, 99a, 119): `deployed-smoke.spec.ts`. Tests: "the home route renders on
  the live host", "/login renders with a 200 on direct load and on refresh", "the live response
  carries frame-ancestors none". **Status: `red`, not `green`/`done`** - run for real against
  `https://hierarchy-tree.pages.dev` before this branch merged, correctly failing because the
  live site currently serves an unrelated placeholder page, not this app.
  Evidence: `evidence/steps/step38-red.txt`. This is expected and by design - see "The post-merge
  obligation" below.
- **Boundary**: not formally closed. `loop milestone verify 6` and `gate G2 pass` both refuse
  while step 38 is pending, by the loop tool's own design - a milestone boundary requires every
  registered step in it to be `done`, and step 38 structurally cannot reach `done` before a real
  deployment exists. Steps 33-37 are individually `done` with their own red/green evidence under
  `evidence/steps/`. The G3 verification pass and the G4 dual review (below) both covered the
  full M6 diff in place of the formal milestone verify/review, and are the operative evidence for
  everything in M6 except the post-merge obligation itself.

## G3 verification (gate: passed)

Fresh-context `loop-verifier` (agent af901495b89468e65) ran the full suite and checked all 135
PRODUCT.md invariants:

- `npm run verify`: green, 63 test files, 96%+ coverage
  (`evidence/g3-verify-20260813-200803.txt`).
- `npm run e2e`: green, 19/19, Playwright traces on
  (`evidence/g3-e2e-20260813-200803.txt`, full HTML report
  `evidence/g3-e2e-playwright-report-20260813-200803.tar.gz`).
- `npm run smoke:live`: green, 2/2, against the real backend
  (`evidence/g3-smoke-live-20260813-200803.txt`).

Found 3 verification gaps, all fixed and covered (`Gap-1..3`, disposition `covered`):

- **Gap-1** (invariant 58): no unit test asserted the three sink modules' import graph carries no
  transport import and no network global. Added
  `src/platform/observability/sinks/sinkImportGraph.test.ts`.
- **Gap-2** (invariant 134): no test asserted `package.json`'s dependencies equal the allow-list
  exactly. Added a test in `scripts/repository-configuration.test.ts`.
- **Gap-3** (invariant 68): `right-to-left.spec.ts` only loaded `/`, never `/login` or `/__kit`,
  and asserted only overflow/axe rather than a mirrored inline-start indicator. Extended to cover
  both routes plus a `getComputedStyle(...).direction` assertion and a screenshot per route;
  `kit-route.spec.ts` gained a matching RTL test for the third named route.

Re-verified after gap fixes: `npm run verify` green (63 test files,
`evidence/g3-gap-fixes-verify.txt`), `npm run e2e` green (19/19,
`evidence/g3-gap-fixes-e2e.txt`).

`gate G3 pass` explicitly scoped invariants 123/124/126a out - they cannot be satisfied before
merge and are tracked here instead.

## G4 dual review (gate: pending final tally, see below)

### Per-milestone review rounds

Every milestone (M1-M5) received its own fresh-context `loop-reviewer` pass at its boundary,
findings tagged `--round milestone-<n>`, fixed and dispositioned before the next milestone
started - summarized in each milestone's section above. 22 findings across M1-M5, 6 blocking, all
fixed; 3 accepted as tracked non-defects/residual limitations (Claude-2, Claude-4, Claude-8,
Claude-77).

### Final-round Codex second opinion

Codex (`codex exec -s read-only`), fresh thread, full diff
`1cb72c10804e3e462795eb74cb28fc14073b9b86..HEAD`. Raw output:
`evidence/reviews/g4-codex-raw-output.txt`. 8 findings (Codex-56..63), 6 blocking, all
dispositioned `fixed`:

- **Codex-56** (blocking): a backslash-prefixed resource path escaped the configured API origin
  (`new URL('/\\evil.example/x', 'https://api.example.com')` resolves off-origin). Fixed by
  comparing the resolved URL's `.origin` against the configured origin instead of a `//`-prefix
  heuristic. Regression test: "rejects a backslash-escape resource path without calling the
  transport".
- **Codex-57** (blocking): the production CSP was built from an unvalidated build-time
  `VITE_API_BASE_URL` string, bypassing the runtime Zod validation entirely. Fixed:
  `vite.config.ts` now validates with the same `z.url({protocol: /^https$/})` rule as
  `configurationSchema.ts`, falls back to the documented default, and passes only the parsed
  URL's `.origin` (never the raw string) into the CSP builder. Tests added in
  `scripts/repository-configuration.test.ts` ("CSP origin resolution"), including a direct
  directive-injection-payload test.
- **Codex-58** (blocking): the `verify` and `live-smoke` CI jobs inherited repository-default
  `GITHUB_TOKEN` permissions (only `deploy` was scoped). Fixed: both now carry
  `permissions: {contents: read}`. Tests added in `scripts/workflow-configuration.test.ts`.
- **Codex-59** (blocking): a deadline firing while `response.json()` was pending was reported as
  a parse failure instead of a timeout/cancellation. Fixed: the catch now checks `signal.aborted`
  before falling back to `{kind: 'parse'}`. Regression test: "reports a timeout, not a parse
  failure, when the deadline fires while the body is still being read".
- **Codex-60** (blocking): `ConfigurationErrorScreen` remained a stale milestone stand-in
  rendering raw environment-key names, contradicting invariants 16 and 60. Fixed: rebuilt on the
  shared `ErrorState` kit component with copy from the statically bundled `common.json` catalogue
  (a plain JSON import rather than `useTranslation()`, since this screen renders before
  `createRuntime()` can build an i18next instance - documented in a code comment).
- **Codex-61** (blocking): `assert-no-secrets.mjs` scanned only `src/**/*.{ts,tsx}` and a narrow
  `dist` glob, missing `.github/`, `scripts/`, `public/`, docs, and nested `.env` files. Fixed:
  rewritten to enumerate every git-tracked file via `git ls-files`, filtered by scannable
  extension, with a documented exclusion list for legitimate high-entropy content (lockfile
  hashes, the audit trail, SHA-pinned Action refs, the scanner's own pattern definitions).
  Regression test added in `scripts/guard-scripts.test.ts` proving discovery mode catches a
  keyword secret in `.github/workflows/` and ignores one in a `*.test.ts` file.
- **Codex-62** (non-blocking): an in-flight caller cancellation emitted no timing record, leaving
  invariant 31's "one timing record per attempt" unrepresentable for that case. Fixed:
  `TimingRecord.outcome` gained a `'cancelled'` member; the caller-abort branch (after an attempt
  was already made) now calls `recordTiming` before returning. Regression test: "a caller abort of
  an in-flight attempt still records its timing, with a cancelled outcome".
- **Codex-63** (non-blocking): the logical-deadline test hung the first attempt until timeout and
  never exercised the specified first-failure/backoff/hanging-retry sequence, so it would not
  catch a per-attempt-reset deadline bug. Fixed: added "the deadline is a single logical-request
  budget spanning a retry, not restarted per attempt" - fails the first attempt, retries after the
  fixed 100ms backoff, hangs the second attempt, and asserts the deadline still fires at the
  original cumulative 1000ms. Confirmed the implementation was already correct; this closed a
  test-quality gap, not a code defect.

Also independently found and fixed in this round: **invariant 21's lint coverage gap** -
`globalThis.fetch` and `new Image().src` were reachable but not banned by the existing
`no-restricted-globals`/`no-restricted-properties`/`no-restricted-syntax` rules. Fixed:
`globalThis.fetch` added to the banned properties list, a new `IMAGE_SRC_SYNTAX`
`no-restricted-syntax` selector added, and a coverage meta-test added to
`scripts/eslint-configuration.test.ts` ("the network ban covers every enumerated identifier in
bare and member forms").

### Final-round Claude fresh-context confirmation

A fresh-context `loop-reviewer` (agentic-loop:loop-reviewer, not the same context that made any
of the fixes above) reviewed the complete final diff after all Codex-56..63 fixes landed, to
independently confirm correctness and hunt for anything else. Findings and disposition recorded
under `--round final` alongside the Codex findings above once that review returns.

Re-verified after all G4 fixes: `npm run verify` green, `npm run e2e` green (19/19). Evidence:
`evidence/g4-fix-verify.txt`, `evidence/g4-fix-e2e.txt`.

## Verification summary

- Full unit/component suite: `npm run test:coverage` - green, 63+ test files, 96%+ statement
  coverage (thresholds: 85% lines/branches/functions repo-wide, 100% for
  `src/features/*/domain`).
- `tsc -b` - clean.
- `npm run lint` - green (ESLint boundaries, restricted-imports/globals/properties/syntax,
  domain-vocabulary, physical-properties, secret scan).
- `npm run build` + `npm run verify:build` - green, all build-output invariants (chunk graph,
  declaration table, base path, kit-route absence) hold against the real production bundle.
- `npm run size` - green, entry 112.99kB/150kB gzipped, stylesheet 3.81kB/15kB, all four route
  and catalogue chunks within budget.
- Full e2e suite: `npx playwright test` - green, 19/19 across `chromium` and `development`
  projects (accessibility/axe, RTL mirroring, error-boundary recovery, telemetry-buffer
  assertions, kit-route browser checks).
- `npm run smoke:live` - green, 2/2 against the real backend.
- `npm run e2e:deployed` - **red by design**, run for real against the live production host
  before merge; see "The post-merge obligation".

## The post-merge obligation

Mirroring PLAN.md's own "post-merge obligation" section, restated here as the operative record:

Invariant 121 forbids preview deployments, so no pull-request run produces a URL to test.
Invariants 123 and 124 are provable only after the merge to `main`, and invariant 126a makes that
an obligation rather than a gap.

**After the user merges this PR:**

1. The `deploy` job runs on push to `main`, deploys `dist/` via the SHA-pinned wrangler action,
   and asserts the returned deployment URL equals `deployment.json`'s `productionHostname`.
2. `npm run e2e:deployed` runs against that same `productionHostname`, exercising step 38's three
   tests for real.
3. Its output is captured as `specs/phase-1-setup/evidence/deployed-smoke.txt` and this PROOF.md
   is updated to cite it.
4. Only then: `loop step 38 green` -> `done`, `loop milestone verify 6` -> `review 6`,
   `gate G2 pass`, `gate G5 pass`, `loop transition retro` -> `done`.

**The phase is not complete until step 4 happens.** This PR is not the phase closing quietly on a
green pull request (invariant 119) - it is the documented handoff point the loop's own gates
refuse to skip past.

## Reviews (summary)

- **G1 spec validation** (prior to this PR, recorded in `loop.json`): grill rounds against
  PRODUCT.md/TECH.md, Claude-1..74 + Codex-1..55 combined across four delta-recheck rounds, all
  blocking findings resolved and re-confirmed except a declined fourth confirmation cycle on the
  final nine Codex fixes (carried forward as risk, noted in PLAN.md's "Carried risk from G1" and
  concentrated in M1/M6 - matches where this PR's own G4 findings concentrated: CI permissions,
  CSP, secret scan). User sign-off recorded (`gate G1 pass --signoff`).
- **G3 verification**: see above - passed, 3 gaps found and covered.
- **G4 review**: 5 milestone-boundary rounds (22 findings, 6 blocking, all fixed) + 1 final-round
  Codex second opinion (8 findings, 6 blocking, all fixed) + 1 final-round Claude fresh-context
  confirmation (pending at time of writing, appended once returned) + 1 independently-found lint
  coverage gap (fixed). See above for the full findings ledger.
- Security pass: `security_review: true` at triage (this phase touches CSP, secret scanning, and
  the deploy job's credential handling). Findings Codex-57, 58, 61 above are the security-relevant
  outcomes of that review; all fixed.

## Known limitations / accepted findings

- **Claude-2, Claude-4** (M1, accepted): a review-agent-briefing conflation and a staged-rollout
  gap matching PLAN.md's own documented sequencing - not code defects.
- **Claude-8** (M2, accepted): `assert-domain-vocabulary.mjs`'s regex approach cannot check
  interface/type member (property) names, only identifiers - a structural limitation of the
  chosen approach, tracked rather than silently accepted.
- **Claude-77** (M4, accepted): the kit no-orphan-component completeness check has a stated
  residual scope limit (see its own test comment).
- **G1's declined fourth confirmation cycle**: the final nine G1 delta-round fixes (Codex-45..55)
  rest on Claude-side re-checks only; Codex's raiser-thread confirmation of that round never
  returned and a fourth round was declined as disproportionate. Carried as risk in PLAN.md;
  concentrated in the same M1/M6 surfaces this PR's G4 review re-examined and found real (now
  fixed) defects in.
- **Invariants 123, 124, 126a**: explicitly outstanding, not accepted-as-limitation - see "The
  post-merge obligation" above.
