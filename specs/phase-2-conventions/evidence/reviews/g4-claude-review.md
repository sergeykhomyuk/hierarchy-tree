# G4 fresh-context Claude review - phase-2-conventions

Reviewer: agentic-loop:loop-reviewer (fresh context, read-only)
Diff: evidence/reviews/full-diff.txt (d31a2b5..HEAD, src/features/auth)

## Verdict
1 finding (0 blocking)

## Claude-1 (non-blocking)
New const-enums were inlined into existing multi-export files instead of following
the repo's own established one-symbol-per-file pattern for this exact construct.

Files: loginCardState.ts (now 5 exported units), session/readSession.ts (now 4),
session/sessionShadow.ts (now 5, up from 4), data/lookupUserIdentifier.ts (now 3,
up from 2).

The task's own reference model, platform/observability/signInOutcome.ts, gives each
const-object enum its own dedicated file. This diff instead adds the six new enums
directly into files that already export an unrelated function/type, increasing each
file's export surface beyond what one-symbol-per-file allows.

These files already had more than one export before this diff, so this is a
pre-existing condition the diff touches and makes worse rather than one it
introduces from a clean file. No compile or runtime effect - purely an
organizational/convention deviation.

Non-blocking: structural-convention nit, not a correctness or contract issue.

## Answers to review questions
- Runtime behavior changes: none found. All six enums' member values checked
  against the original string literals - exact match. Every rewritten import
  traced to its new barrel - correct bindings. Outer index.ts barrel's export
  surface unchanged; nothing outside features/auth references a new enum symbol.
  Import graph among the four new subdirectory barrels checked - no cycle
  (domain/ has zero outgoing imports into data/guard/session).
- Convention deviations: barrel purity and named-exports-only hold (every new
  index.ts is re-exports only, no default exports, no side effects). The one
  deviation is Claude-1 (one-symbol-per-file). LoginPage.tsx/LoginAlert.tsx:
  memo wrapping, prop typing, aria-describedby structure untouched; no
  accessibility or memoization regression in the touched lines.
- Test honesty: no assertions weakened or rewritten; touched test files only had
  import paths repointed.
