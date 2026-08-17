# G4 Codex second opinion - phase-2-conventions

Fresh thread, read-only, ran `git diff d31a2b5..HEAD -- src/features/auth` directly.

## Verdict
2 findings (1 blocking)

## Codex-1 (BLOCKING)
SessionUnreadableReason is exported despite AC6 requiring internal single-file scope,
expanding readSession.ts's module surface unnecessarily.
File: src/features/auth/session/readSession.ts:20-27; specs/phase-2-conventions/PLAN.md:42-44.
Why it matters: external code can now depend on an implementation-only diagnostic
taxonomy, violating the explicit scope and export-surface constraint.

## Codex-2 (non-blocking)
All nine added step evidence logs contain a trailing blank line rejected by
`git diff --check d31a2b5..HEAD`.
Files: specs/phase-2-conventions/evidence/steps/step1-green.txt:9 through
step6-green.txt:9; step7-green.txt:6 through step9-green.txt:6.
Why it matters: the committed patch fails Git's whitespace validation, although
runtime behavior is unaffected.

## Answers to review questions
- AC1: satisfied except for the SessionUnreadableReason export-surface violation
  (Codex-1). All four barrels exist, every inspected cross-subdirectory import uses
  them, the root barrel retains the same exported names, outside consumers still
  import @features/auth unchanged.
- AC2-AC6: all six enums' const objects, call sites and runtime values verified
  correct against the d31a2b5 baseline. AC6 (SessionUnreadableReason) fails only on
  the export-scope clause; behavior and values are correct.
- Regressions/scope: none in production code. Diff also touches 12 files under
  specs/phase-2-conventions/ (PLAN.md, loop.json, evidence) - no production or test
  code outside src/features/auth changed.
- Import cycle: none. domain has no reverse dependency; guard -> session/domain,
  data -> domain, session -> domain.
- Test honesty: loginCardState.test.ts, LoginPage.test.tsx, readSession.test.ts and
  lookupUserIdentifier.test.ts meaningfully exercise the changed discriminants they
  cover; noted they would not independently catch a drifted SessionUnreadableReason
  value (warning metadata never asserted) since that enum's own call sites aren't
  directly assertion-checked.

## Fix confirmation (same thread)
Prompted with the fix (removed `export` from SessionUnreadableReason's const and
type declarations in readSession.ts; nothing else changed, never re-exported
elsewhere) and asked to confirm resolution.
