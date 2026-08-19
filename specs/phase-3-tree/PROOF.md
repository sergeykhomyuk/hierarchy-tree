# Proof of completion: phase-3-tree

## Task

Phase 3 of hierarchy-tree: the organizational hierarchy page - a pure, exhaustively tested
tree domain (multiple roots, missing managers, cycles), a repository that validates the
Firebase payload at the boundary and tolerates bad rows, a four-state page (skeleton, error,
empty, data), expand/collapse that survives a refresh/link/back-button through the URL, the
full WAI-ARIA tree keyboard contract, and the closing work (README, decision log, budgets,
privacy sweep, pipeline integrity). Delivered as an L-size loop across
`specs/phase-3-tree/PRODUCT.md`'s 196 numbered invariants, `PLAN.md`'s five milestones and
52 TDD steps.

## Status: implementation and review complete; one deferred item before `done`

Every milestone (M1-M5) is verified and reviewed. `npm run verify` and the full e2e suite
are green on this branch. One invariant - **98**, the by-hand mixed-content screenshot
against the *deployed* `https://` origin - cannot be captured yet: the currently deployed
site (`hierarchy-tree.pages.dev`) still serves the pre-phase-3 build (checked 2026-08-19;
its CSP still reads `img-src 'self' data:`, without this phase's widening). The user
decided (2026-08-19, recorded in `loop.json`'s log) to open the PR now and capture that one
screenshot after merge and deploy, before this loop transitions to `done` - it is the only
outstanding item.

## Requirements -> evidence, by milestone

### M1 - The tree domain, and the tripwires that block it (steps 1-8)

- Step 1 (194): retired the phase-1 anticipation tripwires (`buildForest`/`flattenVisible`
  out of `WHOLE_SCOPE_BANNED_NAMES`, the `role="tree"` check dropped) so the domain and
  widget below could be built under their real names.
- Step 2 (52, 24): branded `PersonIdentifier`/`EmailAddress` with parsers, the `Person`/
  `TreeNode`/`ForestAnomalies` types and fixture set.
- Step 3 (6, 8, 9, 17-23): `buildForest` shape - ordered roots, ordered children, manager
  status, direct-report counts, the three summary counts computed after duplicate removal.
- Step 4 (7, 10-16): anomaly handling - dangling managers, self-references, cycles broken at
  the earliest ring member, duplicate ids where the first valid occurrence wins, all
  returned as data.
- Step 5 (24-26): purity and linearity - no mutation of the input, no clock/randomness/
  network/storage/React/logging, bounded per-person visit count.
- Step 6 (27-40): `flattenVisible` - the iterative pre-order walk producing the row model
  (depth, hasChildren, isExpanded, setSize, posInSet, direct-report count).
- Step 7 (87, 88 pure half): `defaultExpansion` - every root plus roots' direct children
  that themselves have children.
- Step 8 (118-121): `parseExpansion`/`formatExpansion`, total by construction.
- **Boundary**: `npm run verify` green, 100% coverage on `src/features/hierarchy/domain/**`;
  existing 41-test e2e suite (phase 2 flows) unaffected. Evidence: `evidence/milestones/
  m1-suite.txt`, `evidence/milestones/m1-e2e.txt`.
- **Review**: fresh-context `loop-reviewer` on the M1 diff (`2e0cc06..HEAD`) - 2 non-blocking
  findings (Claude-1: an email-parser test name overclaims content validation it doesn't do;
  Claude-2: a round-trip test is structurally incapable of catching a caching bug in
  provably-stateless code), both accepted by the user as non-defects. Record:
  `evidence/reviews/m1-claude-review.md`.

### M2 - The boundary, the repository and the loader (steps 9-16)

- Step 9 (47, 50-53): `personSchema`/`usersResourcePath` - safe positive-integer id, required
  name/email, optional manager/photo, everything else (password included) stripped by Zod.
- Step 10 (42-46): `parsePeople` envelope normalization ahead of validation - dense array,
  null-hole removal, object-as-map, `null` as empty, scalar as `invalidEnvelope`.
- Step 11 (54-56): display derivation - trimmed names, untouched email, email fallback when
  both names are empty.
- Step 12 (41, 48, 49, 57, 170, 174): `fetchPeople` repository - the full `HierarchyResult`
  union (data/empty/failure/cancelled), one request per navigation, never throws/rejects.
- Step 13 (160-165 load half): repository telemetry - one `hierarchy.viewed` per completed
  load, drop/anomaly reports, one error event, none for cancellation.
- Step 14 (168): `AnalyticsPayloads` as a feature-augmented interface via declaration
  merging; `AnalyticsEventName` unaltered.
- Step 15 (41, 170, 173, 190 app-layer half): `createHierarchyLoader`, `createAuthenticatedLoader`
  returning `userId`, the runtime exposing its clock.
- Step 16 (124, 161/165 no-route-viewed halves): `shouldRevalidate` on both routes, plus the
  interaction tracker ignoring a revalidation-only state change.
- **Boundary**: `npm run verify` green (100% coverage on hierarchy data/domain); full
  41-test e2e suite green after updating two phase-2 request-count assertions
  (`header.spec.ts`, `login.spec.ts`) that predated this page's own `/users.json` fetch.
  Evidence: `evidence/milestones/m2-suite.txt`, `evidence/milestones/m2-e2e.txt`.
- **Review**: fresh-context `loop-reviewer` on the M2 diff (`cfc3da2..HEAD`) - 3 non-blocking
  findings (Claude-3: repeated-search-param comparison used `.get()` instead of `.getAll()`;
  Claude-4: a null-correlation-id fallback branch untested; Claude-5: anomaly reporting used
  a hardcoded, non-exhaustive kind list), all fixed. Record: `evidence/reviews/
  m2-claude-review.md`.

### M3 - The page: four states, the tree, and expansion (steps 17-30)

- Step 17 (190, 191): UI kit widened generically - `ErrorState` second action + glyph,
  `EmptyState` glyph, both gain unframed mode, `Avatar` gains `onImageError` - no domain type
  in any kit signature.
- Step 18 (99, 171, 172): CSP `img-src` widened; photo requests carry no referrer.
- Step 19 (58-63, 65): `HierarchySkeleton` - decorative, no tree role, announced busy once.
- Step 20: the error state inside the card - alert glyph, heading, retry + secondary action.
- Step 21: the empty state - outline glyph, heading, refresh action.
- Step 22: `HomeRoute` assembles the page's dependencies, retry and refresh callbacks.
- Step 23 (103): `HierarchySummary` - people/manager/root counts, pluralized.
- Step 24: `HierarchyTree`/`TreeRow` render every visible row in row-model order.
- Step 25 (97): photo failure falls back to initials, reported once per person per load.
- Step 26 (108-115): `TreeToggle` and the mouse toggle path.
- Step 27 (116-129): `useExpansion` over `useSearchParams`.
- Step 28: `NavigationRail`, rendered by `AuthenticatedLayout` on every authenticated page.
- Step 29 (153-159): the hierarchy catalogue - every string, all four states.
- Step 30 (179-181): mockup fidelity and the three layout assertions jsdom can't make, via
  Playwright.
- **Boundary**: fresh `agentic-loop:loop-verifier` ran `npm run verify` (green, 97%+
  coverage) and full `npx playwright test --trace` (48/48 green) against the built preview,
  then checked every M3 invariant (steps 17-30) against source. Found 2 genuine gaps:
  Gap-1 (invariant 90, a missing-space template literal dropping the indent rail) fixed with
  a regression test; Gap-3 (invariant 180, no contrast check for the populated tree) fixed
  with a color-contrast-scoped axe scan in both themes. Gap-2 (invariant 102, names not
  catalogue-interpolated) dispositioned **accepted** - see Known limitations. Evidence:
  `evidence/milestones/m3-suite-g3verify-20260817T195951Z.txt`, `evidence/milestones/
  m3-e2e-g3verify-20260817T195951Z.txt`, `evidence/logs/gap1-fix-*.txt`, `evidence/logs/
  gap3-fix-*.txt`, `evidence/screenshots/`, `evidence/traces/`.
- **Review**: fresh `loop-reviewer` on the full M3 diff (`ba67fcb..HEAD`) - 4 findings:
  Claude-6 (**blocking** - the mouse toggle path emitted no telemetry and announced nothing,
  despite step 26 claiming invariants 114/115 done) fixed; Claude-7 (`page.hiddenLabel`
  never pluralized) fixed; Claude-8 (`HierarchySummary`'s composed string can't
  independently pluralize its three nested nouns) **accepted**, same class as Gap-2;
  Claude-9 (you-marker fixture bug plus an untested positive-match path) fixed, which also
  surfaced and fixed a real e2e test-design bug (browser scroll-clamping misread as
  flakiness). All fixes verified with full vitest (551/551) and full Playwright (50/50, 5
  consecutive clean runs).

### M4 - The keyboard and the ARIA contract (steps 31-36)

- Step 31 (130-132): roving tabindex - one tab stop, first Tab lands on the first row, Tab
  back restores the last-focused row.
- Step 32 (133-136): Down/Up/Home/End movement across visible rows.
- Step 33 (137): Enter and Space toggle a focused manager's branch.
- Step 34 (138, 139): type-ahead against the accessible name.
- Step 35 (140, 141): `*` expands every sibling under the same parent, as one atomic action.
- Step 36 (142-152): focus never orphaned, the full ARIA contract closed.
- **Boundary**: fresh `agentic-loop:loop-verifier` ran full `npm run verify` + e2e
  (chromium, 44/44) and checked invariants 130-152 plus the keyboard half of 114/115 against
  source. 2 gaps: Gap-4 (`npm run verify` failing `test:coverage` - `rowNavigation.ts` below
  the domain 100% floor) fixed with `elementAt()` for in-bounds accesses plus 6 new tests;
  Gap-5 (invariant 151 - Skeleton and Empty states never axe-scanned) fixed with new
  component-level axe checks and explicit e2e assertions. Re-verified: `npm run verify`
  exits 0, full e2e 44/44 green.
- **Review**: fresh-context Claude found one blocking defect - Claude-28 (`onKeyDown`
  identity churn defeating `TreeRow` memoization, invariant 91 regression) - fixed and
  verified with a regression test proven via `git stash` to catch it. `npm run verify` exits
  0; full e2e suite (44 tests) passes.
- **Design-fidelity follow-on** (commit `6ebb281`, absorbed into this milestone's scope
  rather than a sixth): a Codex second-opinion pass on the four states against the mockups
  found 4 blocking findings, all fixed and confirmed by the same reviewer - Codex-18
  (loading/unframed empty/error layout untested against the mockups, exact assertions
  added), Codex-19 (320px indentation could force text to zero width and overflow, capped
  and verified), Codex-20 (indent-rail/toggle-border tokens missed the AA contrast floor,
  dedicated tokens added and tested), Codex-21 (mockup styling leaked into shared framed
  kit consumers outside hierarchy scope, scoped to unframed hierarchy states only,
  regression-tested).

### M5 - Closing: docs, budgets, privacy sweep and the by-hand mixed-content check (steps 37-52)

- Step 37 (183, 184): `README.md` rewritten - what the app does, how to run/test/deploy, the
  security gap stated plainly, no Vite-template sentence surviving. Guarded by
  `scripts/documentation-configuration.test.ts`.
- Step 38 (185, 186): the decision-log entries (eleven, after the M5-verify Gap-6 fix and the
  final-review Codex-27 fix - see below) and `ROADMAP.md`'s status board/checkboxes/progress
  log, mechanically agreement-checked in the same test file.
- Step 39: `npm run smoke:live` gains an assertion that the real payload parses into a
  forest with more than one root (`scripts/live-smoke/live-smoke.test.ts`).
- Step 40 (175-178): build-output assertions - the login chunk carries no hierarchy
  signature/catalogue, the hierarchy route chunk stays inside its size budget
  (`build-output/hierarchy-route-isolation.test.ts`).
- Step 41 (187-193, 196): phase 2 re-run unchanged (full e2e suite includes
  `guard.spec.ts`/`header.spec.ts`/`login.spec.ts`/`not-found.spec.ts`, all green); the
  route set is exactly `/`, `/login`, `*`; the hierarchy feature imports no other feature
  and nothing from `app`; the hierarchy domain imports no React
  (`scripts/layer-boundaries.test.ts`, `src/app/routing/routeDefinitions.test.ts`).
- Step 42 (167, 169, 195): telemetry/privacy/console sweep -
  `e2e/hierarchy-telemetry.spec.ts` asserts exact toggle-event counts across two toggles,
  that no telemetry record carries a seeded password/email/first-or-last-name/photo URL,
  and that a full load-expand-collapse flow produces no console error or warning.
- Step 43 (98, 194): pipeline integrity re-checked - no CI step disabled/skipped/
  continue-on-error, no coverage threshold below the phase-1 floor
  (`scripts/pipeline-integrity.test.ts`). Invariant 98's by-hand half: **deferred to
  post-merge** - see Known limitations.
- Steps 44-49 (179-182): mockup-fidelity fixes landed alongside M4's design-follow-on
  (roving tabindex refinement; hierarchy shell/card/row alignment to mockup 1e; loading/
  empty/error alignment to mockups 1f-1h; deepest-manager usability at 320px without
  overflow; the non-text contrast floor for the indent rail and toggle border in both
  themes; unframed hierarchy styling kept out of framed shared-kit consumers).
- Step 50: dedicated unit coverage closing gaps in `useTreeKeyboard`, `TreeAnnouncer`,
  `TreeToggle` and `formatCount`.
- Step 51-52 (192, 193): domain-independent helpers moved to `shared/utils`; a shared
  `shared/routing` module (`ROUTE_PATHS`) replacing three independently-declared login-path
  constants - deviation 9.
- **Boundary**: fresh `agentic-loop:loop-verifier` ran `npm run verify` (exit 0, 642
  unit/component + 18 verify:build tests) and full e2e `--project=chromium` (52/52 green, no
  console errors/warnings), then checked every M5 invariant (98, 167, 169, 175-178, 183-196)
  against source. Found 1 gap - **Gap-6**: `img-src` shipped as `https: http:` (commit
  `e61c1d3`) but the spec documented `https:` only, undocumented in the decision log. The
  user decided to keep `http:` (necessary for invariant 98's own "block only occurs on an
  https origin" claim to be true - a CSP-only `https:` policy would block the photo on
  every origin, not only the deployed one) and record it as a **tenth** deviation rather
  than reverting - done in commit `7f8cd54`, re-verified green. Evidence: `evidence/
  milestones/m5-suite-20260819T075521Z.txt`, `evidence/milestones/
  m5-e2e-20260819T075521Z.txt`.
- **Review**: fresh-context `loop-reviewer` on the M5 diff (`87b3a75..HEAD`) - 5 findings, 1
  blocking: Claude-29 (**blocking** - `ROADMAP.md` cited this very file, `PROOF.md`, before
  it existed) fixed by writing this document; Claude-30 (the new decision-log entry's date
  predated, but was positioned after, the entries it superseded) fixed by re-dating it to
  when it was actually written and clarifying the cross-reference; Claude-31 (the privacy
  e2e test checked only last names, not first names) fixed by adding first-name assertions;
  Claude-32 (the isolation test's "no hierarchy catalogue" claim wasn't actually checked for
  the login route specifically) fixed with a manifest-based dynamic-import assertion;
  Claude-33 (the toggle-count test only ever toggled once) fixed by adding a second toggle
  and asserting the event count accumulates to 2. All four non-blocking fixes are purely
  additive/mechanical, verified by re-running the affected suites; Claude-29 (blocking) is
  confirmed by this same reviewer thread below.

### Final whole-branch review (post-M5, before `done`)

A last fresh-context Claude review plus Codex ran across the *entire* branch diff (not one
milestone), after the eleven-file guarded-test-hash rebase and the deviation-count/decision-
log updates settled. 7 findings, 6 blocking:

- **Claude-34 / Codex-23** (found independently, same bug, **blocking**): `expandMany`
  depended on `expandedIds` (a fresh `Set` every render) and, one layer deeper, on
  react-router's own `setSearchParams` - itself unstable across a URL change, since it closes
  over the `searchParams` object `useSearchParams()` recomputes from `location.search` on
  every navigation. Both cascaded through `handleExpandSiblings` -> `useTreeKeyboard`'s
  `handleKeyDown` -> every `TreeRow`'s `onKeyDown`, defeating memoization on every real toggle
  - the same invariant-91 bug class as the earlier Claude-28 finding, through a different
  path. Fixed: both `toggleExpanded` and `expandMany` now read `expandedIds` and
  `setSearchParams` through refs updated in dependency-free `useEffect`s, so their own
  identity depends only on `roots` (stable across a toggle). A new render-count test against
  the real `useExpansion`/`useSearchParams` composition proves stability across two real
  toggles, verified red-then-green. Confirmed by the raising Claude thread, which independently
  re-derived the dependency chain rather than trusting the description; Codex's confirmation
  pass hit its own API session rate limit before it could re-check this specific fix (see
  "Codex availability" below).
- **Codex-22** (**blocking**): `Avatar`'s `imageFailed` state survived a revalidation-driven
  retry - react-router keeps the same component instances mounted through a
  transition-wrapped navigation - so Retry neither re-attempted a fixed photo nor re-reported
  a still-broken one (invariant 97). The existing test masked this by unmounting+remounting
  instead of rerendering the same instance. Fixed: `Avatar` gains a `resetToken` prop (`roots`,
  threaded through `TreeRow`), resetting `imageFailed` via React's adjust-state-during-render
  pattern whenever a new payload resolves; `HierarchyTree.test.tsx`'s retry test rewritten to
  `rerender()` the same instance. Confirmed by Codex's own re-check pass.
- **Codex-24** (**blocking**): `parsePeople` discarded each malformed row's position, keeping
  only a deduped envelope-wide field-name set, and the all-invalid path reported no
  field-level detail at all (invariant 53). Fixed: `parsePeople` now returns
  `failures: {position, fields}[]`; `fetchPeople` reports it on both the partial-drop and
  all-invalid paths. Confirmed by Codex's own re-check pass.
- **Codex-25** (**blocking**): `parseExpansion`'s skipped-segment count was computed and
  silently discarded - never reported to telemetry, so a stale shared link produced no signal
  (invariant 121). Fixed: a `lastReportedParamRef` guard reports once per genuine parse, not
  twice under React StrictMode's development-only double-invoke; verified red-then-green
  (fails at 2 calls without the guard, passes at 1 with it) under a StrictMode-wrapped test.
  Self-verified and confirmed by the independent Claude-34 thread's re-derivation of the same
  code path; Codex's own confirmation pass hit its rate limit first (see below).
- **Codex-26** (**blocking**): `defaultExpansion`'s childless-root ids (legitimate per
  invariants 87/88) leaked into the `expanded` URL parameter on write, contradicting
  invariant 116's "ids of the expanded manager rows" - and would have produced false-positive
  skip reports once Codex-25 was fixed. Fixed: `expansionParameter.ts` exports
  `collectManagerIds`; `useExpansion.ts` filters to manager ids only before `formatExpansion`
  in both write paths, with a regression test. Confirmed by Codex's own re-check pass.
- **Codex-27** (non-blocking): `SignedInHeader`'s own visual restyling (fixed height,
  background, padding) shipped and was tested but had no decision-log entry, contradicting
  invariants 2/3/187/190's "header is phase 2's, unchanged here" framing. Fixed:
  `PRODUCT.md` invariants 2 and 3 now reference deviation 11's styling-only exception instead
  of claiming the header is unconditionally unchanged; `ARCHITECTURE.md`'s decision log gains
  the eleventh entry. Self-verified (wording-only change).

**Codex availability**: Codex's confirmation subagent hit its own Claude API session rate
limit twice (reset ~13:30 Europe/Dublin) partway through re-checking Codex-23/25/27. Per
`codex-contract.md`'s unavailability fallback, the user was asked explicitly whether to wait
or proceed single-reviewer; the user chose to proceed now (2026-08-19, recorded in
`loop.json`'s log). Codex-22, Codex-24 and Codex-26 completed their own re-check pass before
the limit hit and are Codex-confirmed as usual. Codex-23, Codex-25 and Codex-27 are
dispositioned on self-verification (a red-then-green test for each code fix; a mechanical
grep-checkable agreement test for the wording fix) plus, for Codex-23 specifically,
independent confirmation from the Claude-34 thread, which re-derived the identical dependency
chain from source rather than trusting either finding's description. All six blocking
findings' fixes are covered by the full suite (`npm run verify` exit 0) and full e2e
(`npx playwright test --project=chromium`) re-run clean after every fix, per the guarded-test
hash rebase covering the eleven affected files (all with their real, reviewed diffs shown to
and approved by the user before the rebase).

## Verification summary

- Full suite: `npm run verify` (typecheck, lint, format:check, test:coverage, build,
  verify:build, size) -> green, exit 0, re-run after the final whole-branch review's fixes.
  648 unit/component tests (143 files), 18 verify:build tests, coverage 97.5%
  statements/96.38% branches/96.34% functions/97.57% lines overall (domain packages at
  100%), all size budgets inside their ceiling (app entry 128.45 kB / 150 kB gzipped).
- e2e: `npx playwright test --project=chromium` -> 52/52 green, re-run after the same fixes,
  including phase 2's own suite re-run unchanged.
- e2e flows exercised: all four hierarchy states (skeleton, error, empty, data); mouse and
  keyboard toggle; the full ARIA keyboard contract (Tab, arrows, Home/End, type-ahead,
  Enter/Space, `*`); URL-driven expansion surviving reload/link/back; telemetry buffer
  contents after toggles and retries; console hygiene across every added flow; axe scans on
  all four states in both themes and at multiple viewports; right-to-left mirroring.
- Traces/screenshots: `specs/phase-3-tree/evidence/traces/`, `evidence/screenshots/`.
- `npm run smoke:live` (manual, outside `verify`): the real `/users.json` payload parses
  into a forest with more than one root - passing as of 2026-08-19.

## Reviews

- **G1 (spec validation)**: fresh `loop-spec-validator` plus Codex on `PRODUCT.md`/
  `TECH.md`. 2 blocking findings - Codex-1 (`setSearchParams` would revalidate loaders on
  every toggle without a `shouldRevalidate` predicate) resolved by the predicate spec'd in
  TECH.md section 4 and built in M2 step 16; Codex-2 (invariant 43's "password never exists
  in memory" was unsatisfiable given `response.json()`) resolved by rewording to the
  satisfiable, testable claim about parsed objects/telemetry/URLs/storage. Both confirmed by
  the raising Codex thread. Record: `evidence/reviews/g1-confirmation-codex.md`.
- **Per-milestone Claude fresh-context reviews (G4 ledger)**: M1 (2 accepted), M2 (3 fixed),
  M3 (4: 3 fixed, 1 accepted), M4 (1 fixed) plus its design-follow-on Codex pass (4 fixed),
  M5 (5: 4 fixed, 1 blocking fixed and self-confirmed) - see each milestone's Review line
  above.
- **Final whole-branch review**: one more fresh-context Claude pass plus Codex across the
  entire branch diff, after the milestone-by-milestone reviews closed - 7 findings, 6
  blocking, all fixed; see "Final whole-branch review" above for the full account, including
  the Codex-availability fallback the user approved.
- Security pass: not separately flagged (`security_review: false`) - the credential/session
  surface belongs to phase 2, unchanged here (invariant 187) and re-verified by phase 2's
  own suite in every full e2e run above.

## Known limitations / accepted findings

- **Invariant 98** (the by-hand mixed-content screenshot against the deployed `https://`
  origin) is **not yet verified**. The deployed site still serves the pre-phase-3 build.
  User decision (2026-08-19): capture the screenshot after this branch merges and deploys,
  before the loop transitions to `done`.
- **Gap-2 / Claude-8** (invariant 102 vs. 155/157 tension): person names and the
  `HierarchySummary` line are not fully catalogue-interpolated for independent
  pluralization of every nested noun. Accepted by the user - fixing it properly would ripple
  into 15-25 existing test assertions across `TreeRow.test.tsx`, `HierarchyTree.test.tsx`
  and `e2e/hierarchy-layout.spec.ts` for a benefit (a locale that needs different pluralization
  per nested noun in one composed sentence) this project doesn't currently need.
- Claude-1/Claude-2 (M1 review): both accepted as non-defects (cosmetic test-name overclaim;
  a round-trip test that structurally cannot miss a bug in provably-stateless code).
