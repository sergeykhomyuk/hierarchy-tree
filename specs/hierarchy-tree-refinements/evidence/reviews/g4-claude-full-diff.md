# Claude fresh-context G4 review — hierarchy-tree-refinements full diff (main..HEAD)

Spawned via agentic-loop:loop-reviewer (read-only, fresh context), reviewing
/private/tmp/.../scratchpad/hierarchy-tree-refinements-full-diff.txt (git diff main..HEAD, 42 files).

## Verdict

2 findings (1 blocking)

## Finding 1 — BLOCKING: an undeclared, unrelated behavior change is bundled into this "behavior-preserving refactor" diff

`src/features/hierarchy/useExpansion.ts` (and its test) is rewritten beyond import-path rewiring: the skipped-segments dedup guard changes from a string-keyed ref (`lastReportedParamRef`, keyed on `expandedParam`) to an object-identity-keyed ref (`lastReportedParsedRef`, keyed on the `parsed` object from `useMemo`), and the effect's dependency array changes from `[expandedParam, roots, parsed.skipped, observability]` to `[parsed, observability]`. A new test, `useExpansion.test.tsx::reports again on a genuine second visit to the same stale link, not only the StrictMode duplicate`, is added to pin the new behavior.

This corresponds to the branch's commit `5beceba fix(phase-3-tree): dedupe the skipped-segments report by parse identity, not string` — explicitly a fix for a *different* task (`phase-3-tree`), not one of this loop's five declared steps. It is:
- not listed in `specs/hierarchy-tree-refinements/PLAN.md`'s acceptance criteria,
- not present in `loop.json`'s `plan_steps` (only steps 1-5 exist),
- not covered by any dedicated red/green evidence file under this loop's `evidence/` directory,
- a genuine change to observable telemetry-adjacent behavior, not merely an import path change.

The change itself looks internally consistent (object-identity is a legitimate fix for the StrictMode-vs-genuine-revisit conflation the old string-keyed guard couldn't distinguish), and it's evidenced by a real test. But it rides along in a diff whose PLAN.md promises five behavior-preserving steps limited to memoization, hook extraction, hook coverage, the auth-analytics move, and barrel rewiring.

- File: `src/features/hierarchy/useExpansion.ts:95-116`, `src/features/hierarchy/useExpansion.test.tsx:266-284`
- Scenario: this loop's G2/G3 evidence never exercised a red state for this specific change, so its correctness was never gated through this loop's own process, only asserted after the fact by the bundled commit.
- BLOCKING — recommend either pulling this commit out into its own gated change/loop, or explicitly amending PLAN.md/loop.json to declare it as a sixth step with its own red/green evidence before G4 sign-off.

## Finding 2 — non-blocking: WHAT-only comments added in two domain files

`src/features/hierarchy/domain/defaultExpansion.ts:4` and `src/features/hierarchy/domain/flattenVisible.ts:23` each restate what the following function signature/name already says, violating this repo's "no comments unless the WHY is non-obvious" convention (CLAUDE.md). Purely a style nit, not observable-behavior-affecting.

## Answers to the review questions

- Import/export rewiring correctness: Verified. domain/index.ts, data/index.ts, and the new testing/index.ts barrels cover every non-test file in their respective folders. No missing or shadowed exports found. testing/index.ts is imported only from .test.tsx files. No circular import risk.
- Auth analytics module augmentation: Correct. analyticsEvents.ts targets `declare module '@platform/observability/analyticsEvents'` correctly. SignInOutcome correctly relocated and rewired in useLoginSubmission.ts/test. Platform's analyticsEvents.ts/index.ts correctly drop the auth-owned keys.
- Accidental behavior change: Yes — Finding 1. Separately traced useHierarchyTreeInteractions.ts's ref-write-in-effect pattern (moved from render-body assignment) and found it behaviorally equivalent given React's guaranteed same-commit effect ordering; not a defect.
- Boundary/layering violations: None found.
- WHAT-comment nit: Finding 2, non-blocking.
- General code quality: domain purity preserved, diffs elsewhere surgical; the one exception is Finding 1.
