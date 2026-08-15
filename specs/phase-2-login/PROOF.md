# Proof of completion: phase-2-login

## Task

Turn the placeholder `/login` route into the real sign-in surface for the hierarchy-tree app: derive a credential secret client-side from an email and password (a byte-exact port of a legacy algorithm, including its documented Unicode defect), look that secret up against a real Firebase database to obtain a user id, land the visitor on the hierarchy page or tell them plainly that no user matches. Write a session that survives a reload and dies with the tab; run a route guard before any data fetch so an unauthenticated visitor never triggers one, and redirect a signed-in visitor away from `/login`. Scope widened during framing to add an authenticated header showing the signed-in user's name (fetched asynchronously via React 19 Suspense) and a logout control, after which Back cannot return to an authenticated view.

## Requirements -> evidence

Organized by PRODUCT.md's own section structure; invariants referenced by number. Full traceability lives in TECH.md's per-invariant test map (`specs/phase-2-login/TECH.md`, "Invariant coverage" sections) and `loop.json`'s `plan_steps` (32 steps, each with its registered test names and red/green evidence).

- **The credential derivation (invariants 1-11)** - byte-exact port of the brief's `encode`, including the deliberate Unicode defect (non-BMP code-point truncation, `undefined ^ x` preserved rather than corrected) and the email-trim deviation.
  - Unit: `deriveSecret.test.ts`, `normalizeToCodeUnits.test.ts`, `substitutionTable.test.ts`, `substitutionTableChecksum.test.ts` - all passing.
  - Live: `scripts/live-smoke/live-smoke.test.ts::live smoke > the signed-in user this account resolves to > derives a real account's secret and resolves it to that account's id` - resolves a real account's secret against the real database (invariant 6a).

- **The secret lookup (invariants 13-22)** - exactly one request during authentication, no users-path traffic in the window, correct outcome classification (signedIn/noMatch/serviceProblem), no retry on a genuine no-match.
  - Unit: `lookupUserIdentifier.test.ts`, `lookupResultSchema.test.ts`, `userIdentifier.test.ts`.
  - e2e: `e2e/login.spec.ts::the login card > issues exactly one secrets request while authenticating, and exactly one users request from the landing route` - windowed network-log assertion (13/14/128), post-M4 collection request counted separately (97).

- **The login card's five states (invariants 23-71)** - idle, ready, submitting, no-match, service-problem, each with correct copy, focus, tab order, and single-flight submission guarding against a double dispatch.
  - Component: `LoginPage.test.tsx` (14 tests, including the full 5-state Tab-order sweep + no-tabindex assertion added at G3), `loginCardState.test.ts`, `useLoginSubmission.test.tsx` (9 tests, including the 3 sign_in_settled outcome-telemetry tests added at G3).
  - e2e: `e2e/login.spec.ts` (7 tests: real sign-in, no-match, service-problem+retry, request-count, credential-leak across 6 surfaces, 5-state axe in both themes).

- **Session storage (invariants 72-83)** - shadow-first reads, tab-scoped, survives reload, dies with the tab, charset-restricted stored id.
  - Unit: `readSession.test.ts`, `writeSession.test.ts`, `clearSession.test.ts`, `sessionRecord.test.ts`, `createTabStorage.test.ts`.

- **The route guard (invariants 84-93)** - unauthenticated visitors redirected before any data fetch, signed-in visitors bounced off `/login`, correct replace-vs-push discrimination, hostile `from` values rejected.
  - Unit: `requireSession.test.ts`, `redirectSignedInVisitor.test.ts`, `resolveDestination.test.ts`, `withSessionGuard.test.ts`.
  - e2e: `e2e/guard.spec.ts` (5 tests: bookmarked-URL redirect with no users request and no flash, sign-in-then-land-on-bookmark, signed-in bounce, Back in both current-entry and push variants, hostile `from` values ignored).

- **The header and signing out (invariants 94-104)** - name/avatar in three presentations (skeleton, resolved, neutral fallback), logout operable before/without a name, session cleared on logout, Back does not return to an authenticated view after sign-out. Amended at M4 (see ARCHITECTURE.md's decision log, 2026-08-15): the header fetches the whole `/users.json` collection and matches client-side, not a per-id path - the real database serves no such path.
  - Unit: `signedInUserSchema.test.ts`, `parseSignedInUsers.test.ts`, `fetchSignedInUser.test.ts` (including the mismatched-JS-type id-matching test added at final G4), `createSignedInUserStore.test.ts`.
  - Component: `SignedInName.test.tsx`, `SignedInHeader.test.tsx`.
  - e2e: `e2e/header.spec.ts` (5 tests: skeleton-to-resolved with box-size proof, neutral fallback with the page beneath still rendered, one request across two authenticated navigations, full keyboard sign-in-and-out, Back-after-signout).
  - Live: `scripts/live-smoke/live-smoke.test.ts::live smoke > the signed-in user this account resolves to > resolves the signed-in user's display name through the real schema` - calls the production `fetchSignedInUser` against the real database (invariant 97e).

- **Keyboard and accessibility (invariants 105-115)** - full ARIA tree keyboard contract on the card, no `tabindex` anywhere, focus indicators, whole-flow keyboard operability.
  - Component: `LoginPage.test.tsx`'s Tab-order sweep (all 5 states).
  - e2e: `e2e/login.spec.ts`'s 5-state axe scan (both themes), `e2e/header.spec.ts`'s full-keyboard test, `e2e/accessibility.spec.ts` (8 tests: not-found, login, header resolved/pending/fallback x2 themes), `e2e/right-to-left.spec.ts`.

- **Internationalization (invariants 116-120)** - every user-visible string from a catalogue, key-echo test locale, RTL layout.
  - Lint: `i18next/no-literal-string`. Build-output: `catalogue-chunks.test.ts`. e2e: `right-to-left.spec.ts`, `kit-route.spec.ts`.

- **Telemetry and security (invariants 121-135)** - typed sign-in/sign-out events, correct outcome discrimination, no credential material in any of 6 named surfaces (whole-value and twelve-character-window), path-segment redaction of the secret.
  - Unit: `redact.test.ts`, `analyticsEvents.test.ts`, `useLoginSubmission.test.tsx`'s 3 outcome-telemetry tests.
  - e2e: `e2e/login.spec.ts`'s credential-leak test (telemetry buffer, sessionStorage, location.href, document.title, history.state, serialised DOM - added at G3), `e2e/telemetry-buffer.spec.ts`.
  - Security: dedicated security review, PASS (see Reviews below).

## Verification summary

- Full suite: `npm run verify` (typecheck, lint, format, coverage, build, verify:build, size) -> green. Evidence: `evidence/g4-final-verify.txt` (latest full run).
- e2e: `npx playwright test --project=chromium --project=development` -> 41/41 green. Evidence: `evidence/g4-final-e2e.txt`.
- Live smoke (non-gating, real database): `npm run smoke:live` -> 4/4 green. Evidence: `evidence/step31-live-smoke-post-review.txt`.
- Coverage: statements 95.97%, branches 95.25%, functions 94.27%, lines 96.04% (domain layer at 100%, arming `vitest.config.ts`'s threshold).
- Milestone boundaries (each independently verified + reviewed): `evidence/milestones/m1-suite.txt`, `m2-suite.txt` + `m2-e2e.txt`, `m3-suite.txt` + `m3-e2e.txt`, `m4-suite-post-review.txt` + `m4-e2e-post-review.txt`.
- e2e flows exercised: real sign-in, no-match, service-problem + retry, request-count invariants, credential-leak across 6 surfaces, 5-state + header accessibility scan in both themes, RTL, the route guard's 5 scenarios, the header's 5 scenarios, console hygiene (dev server), kit-route states.
- Traces/screenshots: `specs/phase-2-login/evidence/` (see the `evidence/` directory for the full inventory; `loop evidence phase-2-login check` reports 2 pre-existing advisory gaps from an accidental in-place overwrite during M4, logged and superseded - see `loop log` history, no live claim depends on the missing files).

## Reviews

- Claude fresh-context review: milestone boundaries M1 (3 findings, accepted), M2 (4 findings, 3 fixed + 1 accepted), M3 (2 findings, fixed), M4 (4 findings, fixed) - `evidence/reviews/m1-claude-review.md` through `m4-claude-review.md`. Final whole-phase review: 1 blocking finding (stale PRODUCT.md/TECH.md text vs the M4 collection-fetch reality), fixed - `evidence/reviews/g4-claude-final-review.md`.
- Codex second opinion (final, whole-phase): 3 findings (2 blocking - independently confirmed the same stale-spec issue, plus a vacuous structural guard test; 1 non-blocking - a console-log identifier disclosure), all fixed - `evidence/reviews/g4-codex-final-review.md`.
- G1 spec validation (grill + Codex): 44 findings across both reviewers, all resolved before implementation began - `evidence/reviews/g1-grill-claude.md`, `g1-codex-review.md`, confirmations in `g1-grill-claude-confirmation.md`, `g1-codex-confirmation.md`, `g1-residue-verification.md`.
- G3 verification gaps (fresh-context verifier, whole-phase): 3 gaps found and covered - credential-leak surface/window coverage, a missing Tab-order sweep, unasserted settled-telemetry outcomes - `evidence/g3-*.txt`.
- Security pass (flagged `security_review: true`): dedicated fresh-context security review, **PASS, 0 findings** - credential handling, session integrity, route-guard completeness, the M4 collection-fetch trade-off, redaction, and other injection surfaces (XSS, open redirect, CSRF) all traced to source and cross-checked against an executable test. `evidence/reviews/security-review.md`.

## Known limitations / accepted findings

- **M1 (accepted):** `redact()`'s path-segment rule applies to every string, not only resource paths (over-redaction is the safe failure mode); `resolveDestination`'s login-route fallback is an exact-string match with no trailing-slash variant (worst case one extra redirect hop, no open-redirect risk); `createSignedInUserStore` permanently caches a failed lookup's `null` result for the page's lifetime (revisited at M4, where the neutral-fallback presentation makes this the correct behavior per ARCHITECTURE.md's decision log).
- **M2 (accepted):** `auth.signed_out` was added to the analytics catalogue ahead of its M4 consumer (matches the M1-accepted `resolveDestination` barrel-export precedent; M4 wired it as planned).
- **Review-dependent invariants (per TECH.md's own "Invariants that are review-dependent" list):** invariants 21, 36, 81, 119, 132, 133, 141, 146 are fully review-dependent by design (statements about trade-offs or design limits, not testable behaviors); invariants 6, 7, 12, 73/74/83, 76, 86, 103, 125 are partially review-dependent, with the covered and uncovered halves named explicitly in TECH.md (e.g. invariant 103's bfcache-restore interval between restore and redirect is not driven in the e2e suite because Chromium's bfcache is not reliably triggerable from Playwright - the unit test for the revalidation logic and the e2e test for the ordinary re-executed-navigation path cover what can be covered; invariants 76/125's twelve-character-window checks cannot catch a leak shorter than twelve characters, an unassertable residue without false positives against ordinary JSON).
- **The M4 collection-fetch trade-off:** the header now fetches the whole `/users.json` collection (which carries every user's plaintext password) once per page lifetime, rather than a single record - there is no per-id path against the real database. The collection is already public and unauthenticated-fetchable directly regardless of this app, so the trade-off is a wider audit surface in a signed-in visitor's own network log, not new access for a new party. Recorded in ARCHITECTURE.md's decision log (2026-08-15) and reflected in PRODUCT.md invariants 14, 18a and 97.
- **`evidence/milestones/m4-suite.txt` and `m4-e2e.txt`:** accidentally overwritten in place during the M4 review-fix cycle (should have used a new filename, as every other re-capture correctly did); original byte content unrecoverable, never committed to git. Superseded by the correctly-registered `m4-suite-post-review.txt`/`m4-e2e-post-review.txt`, both green. Logged in `loop.json`'s log history with the process note. `loop evidence check` will advisory-WARN on the two missing paths going forward; no claim in this document or PRODUCT.md/TECH.md depends on them.
