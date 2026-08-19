# Proof of completion: hierarchy-tree-refinements

## Task

A persistent S-sized refactor loop for small, behavior-preserving hierarchy-tree
improvements. Five steps landed: (1) memoize the visible-row model and its
accessible-name projection so a focus-only render doesn't recompute them; (2)
extract HierarchyTree's focus/toggle/announcement/keyboard orchestration into
a feature hook, useHierarchyTreeInteractions; (3) add focused coverage for that
hook's defensive branches; (4) move auth's analytics event declarations and
SignInOutcome out of the domain-free platform/observability layer into a
feature-owned analyticsEvents.ts (declaration merging), mirroring the hierarchy
feature's existing pattern; (5) add index.ts barrels to hierarchy's data/,
domain/ and testing/ subfolders and rewire ~15 files to import through them
instead of deep individual files.

## Requirements -> evidence

- AC1 (focus-only render doesn't call flattenVisible again):
  - Test: `src/features/hierarchy/HierarchyTree.test.tsx::memoizes visible rows and accessible names across a focus-only render` - passing (`npm run test`, 2026-08-19)
  - Red: evidence/step1-red.txt (focus-only render called flattenVisible twice, pre-fix)
  - Green: evidence/step1-green-and-verify.txt

- AC2 (focus-only render doesn't recompute accessible names): same test as AC1 - passing.

- AC3 (HierarchyTree suite + verify gate stay green): full suite + `npm run verify` green after every step - evidence/step1-green-and-verify.txt, evidence/step2-green-and-verify.txt, evidence/step3-hook-coverage-and-verify.txt, evidence/step4-green-and-verify.txt, evidence/step5-green-and-verify.txt, evidence/g3-full-verify.txt (post-commit re-run).

- AC4 (loop stays active for later tweaks): honored - two further tweaks (steps 4, 5) landed in the same loop before closing.

- AC5 (HierarchyTree delegates to a feature interaction hook, no behavior change):
  - Tests: `HierarchyTree.test.tsx::the row that receives focus becomes the tabbable row, and the rest fall out of the tab sequence`, `::collapsing the branch containing the tabbable row leaves exactly one still-rendered row tabbable`, `::clicking a toggle emits one telemetry event carrying the new state and the row's depth, with no name, email or person id`, `::a keyboard-driven toggle leaves a row under a different root unrendered` - all passing (`npm run test`, 2026-08-19)
  - Case (c): behavior-preserving extraction guarded by the pre-existing 42-test HierarchyTree contract - evidence/step2-baseline.txt, evidence/step2-green-and-verify.txt

- AC6 (extracted hook has focused defensive-branch coverage):
  - Tests: `useHierarchyTreeInteractions.test.tsx::delegates a missing-row toggle without telemetry or an announcement`, `::clears the tab stop when the visible row list becomes empty` - passing, hook reached 100% coverage in every metric - evidence/step3-hook-coverage-and-verify.txt

- AC7 (auth analytics events + SignInOutcome move to feature-owned declaration merging):
  - Tests: `src/features/auth/data/analyticsEvents.test.ts::the auth analytics augmentation > the auth events are visible to the observability facade through declaration merging`, `::no auth vocabulary appears in an exported platform identifier` - passing (`npm run test`, 2026-08-19)
  - Red: evidence/step4-red.txt (new test failed to resolve `./signInOutcome` and `./analyticsEvents`, which didn't exist yet)
  - Green: evidence/step4-green-and-verify.txt
  - e2e: evidence/e2e-traces/auth-login-flow.zip, evidence/e2e-traces/auth-signed-out-flow.zip - auth.sign_in_started/settled and auth.signed_out still fire correctly post-move

- AC8 (hierarchy data/domain/testing barrels, deep imports rewired):
  - Tests (representative, of the pre-existing suite guarding this behavior-preserving move): `HierarchyTree.test.tsx::renders every visible row from the row model, in order, and nothing else`, `HierarchyPage.test.tsx::the loading state announces itself busy once and stops when data arrives`, `TreeRow.test.tsx::the row accessible name is the person name plus the you marker and not the email, the count or the toggle glyph`, `useExpansion.test.tsx::a URL carrying expanded renders exactly those branches open and ignores the default expansion`, `useTreeKeyboard.test.tsx::moves focus to the next row on ArrowDown`, `useHierarchyTreeInteractions.test.tsx::delegates a missing-row toggle without telemetry or an announcement` - all passing
  - Case (c): behavior-preserving import-path rewiring guarded by the pre-existing full suite - evidence/step5-green-and-verify.txt
  - e2e: evidence/e2e-traces/hierarchy-keyboard-contract.zip, evidence/e2e-traces/hierarchy-telemetry-buffer.zip, evidence/e2e-traces/hierarchy-telemetry-privacy.zip

## Verification summary

- Full suite: `npm run verify` -> green, 144 test files / 653 tests, typecheck/lint/format/coverage/build/verify:build/size all passing (2026-08-19, post-commit re-run: evidence/g3-full-verify.txt)
- e2e flows exercised: full `npm run e2e --trace on` run, 60/60 Playwright tests green across auth (login, logout/header), hierarchy (keyboard contract, telemetry buffer + privacy, layout, accessibility), route guards, error boundary, kit-route - evidence/g3-e2e-run.txt
- Traces/screenshots: specs/hierarchy-tree-refinements/evidence/e2e-traces/ (auth-login-flow.zip, auth-signed-out-flow.zip, hierarchy-keyboard-contract.zip, hierarchy-telemetry-buffer.zip, hierarchy-telemetry-privacy.zip)
- Zero new console errors/warnings: covered by e2e/hierarchy-telemetry.spec.ts's "every hierarchy flow produces no console error or warning" and e2e/development-console.spec.ts, both green
- Design track: not applicable (design: false)

## Reviews

- Claude fresh-context review (agentic-loop:loop-reviewer, full `main..HEAD` diff): 2 findings (1 blocking) - evidence/reviews/g4-claude-full-diff.md
- Codex second opinion (fresh thread, full `main..HEAD` diff): 2 findings (1 blocking) - evidence/reviews/g4-codex-full-diff.md
- Both reviewers independently raised the same blocking issue (Codex-1/Claude-1): commit `5beceba` (already on the branch before this loop's steps 4-5 began) changes hierarchy expansion-telemetry dedup behavior. Investigated and confirmed: this is `phase-3-tree`'s own G4 finding Codex-25, already fixed with a self-verified red/green test and explicitly user-approved on 2026-08-19 (`specs/phase-3-tree/loop.json`) - that loop (still open, phase `retro`) is what this branch was cut from, so the commit rides along in the diff without being part of this loop's own scope. User confirmed accepting this disposition 2026-08-19.
- Both reviewers also independently raised the same non-blocking style nit (Codex-2/Claude-2): two WHAT-only comments in `defaultExpansion.ts`/`flattenVisible.ts`. User had already explicitly chosen to include these in this PR earlier in the session.
- Security pass: not applicable (security_review: false)

## Known limitations / accepted findings

- Codex-1 / Claude-1 (blocking, accepted): pre-existing, already-vetted `phase-3-tree` fix (Codex-25) riding along in the diff from branch ancestry - not new or ungated work; no action needed in this loop.
- Codex-2 / Claude-2 (non-blocking, accepted): two WHAT-only comments in `defaultExpansion.ts` and `flattenVisible.ts`, user-approved for inclusion in this PR.
