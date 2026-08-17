# Proof of completion: phase-2-conventions

## Task

Align `phase-2-login`'s `src/features/auth` (61 files) with the `typescript-coding` and
`react-coding` skills' conventions before that branch merges: add the missing `index.ts`
barrels for the `domain/`, `data/`, `guard/` and `session/` subdirectories and repoint
every deep cross-subdirectory import through them, and extract six discriminant unions
into `as const` object enums matching the repo's `SignInOutcome` precedent. Strict
behavior-preservation contract throughout - zero functional change, structural only.
Scope confirmed with the user via AskUserQuestion at Frame and again mid-review: analytics
event-name strings left as raw literals (matches the rest of the app's identical pattern);
each enum stays colocated with the type/function it discriminates rather than getting its
own file (tightly-coupled state-machine modules, not standalone shared taxonomies).

## Requirements -> evidence

- **AC1: `domain/index.ts`, `data/index.ts`, `guard/index.ts`, `session/index.ts` each
  re-export their subdirectory's public surface; every cross-subdirectory import (13 sites)
  and the feature root `index.ts` go through the barrel instead of a deep path; no
  export-surface expansion; consumers outside `features/auth` unaffected.**
  - Steps 1-4, tests: `deriveSecret.test.ts`, `userIdentifier.test.ts`,
    `lookupUserIdentifier.test.ts`, `requireSession.test.ts`,
    `redirectSignedInVisitor.test.ts`, `readSession.test.ts` - all passing (case c, na)
  - `evidence/steps/step1-green.txt` through `step4-green.txt`
  - Verified by grep: zero deep imports crossing a subdirectory boundary remain
    (`grep -rn "from '\.\./\(domain\|data\|guard\|session\)/"`, empty result)
  - Verified by both G4 reviewers: outer `index.ts` barrel's export set unchanged; no
    import cycle among the four new subdirectory barrels (`domain` has zero outgoing
    imports into the other three)

- **AC2: `LoginCardStateKind`/`LoginResultOutcome` const-object enums replace the raw
  `idle`/`ready`/`submitting`/`noMatch`/`serviceProblem`/`untouched` literals in
  `loginCardState.ts`, `LoginPage.tsx`, `LoginAlert.tsx`, `useLoginSubmission.ts`.**
  - Step 5, tests: `loginCardState.test.ts`, `LoginPage.test.tsx` - passing (case c, na)
  - `evidence/steps/step5-green.txt`

- **AC3: `SessionStatus` const-object enum replaces `signedIn`/`signedOut` in
  `session/readSession.ts`, `guard/requireSession.ts`, `guard/redirectSignedInVisitor.ts`.**
  - Step 6, test: `requireSession.test.ts` - passing (case c, na)
  - `evidence/steps/step6-green.txt`

- **AC4: `SessionShadowStatus` const-object enum replaces `unset`/`set`/`cleared` in
  `session/sessionShadow.ts`, `session/readSession.ts`.**
  - Step 7, test: `readSession.test.ts` - passing (case c, na)
  - `evidence/steps/step7-green.txt`

- **AC5: `LookupOutcomeKind` const-object enum replaces `signedIn`/`noMatch`/
  `serviceProblem`/`cancelled` in `data/lookupUserIdentifier.ts`, `useLoginSubmission.ts`;
  kept independent from `platform/observability`'s `SignInOutcome` (different domain).**
  - Step 8, test: `useLoginSubmission.test.tsx` - passing (case c, na)
  - `evidence/steps/step8-green.txt`

- **AC6: `SessionUnreadableReason` const-object enum replaces `invalid_json`/
  `invalid_shape`/`wrong_version` in `session/readSession.ts`, single-file scope.**
  - Step 9, test: `readSession.test.ts` - passing (case c, na)
  - `evidence/steps/step9-green.txt`
  - Initially exported despite the single-file-scope promise (Codex-1, blocking, see
    Reviews); fixed by removing `export` from both declarations - `evidence/g4-final-verify.txt`

## Verification summary

- Full suite: `npx vitest run` -> green at every step boundary and after the G4 fix,
  108 files / 430 tests
- Full CI verify chain: `npm run verify` (typecheck + lint + format:check + test:coverage
  + build + verify:build + size) -> green end-to-end, `evidence/g3-verify-full.txt` and
  (post G4 fix) `evidence/g4-final-verify.txt`
  - Coverage: 96.03% statements, 95.23% branches, 94.44% functions, 96.1% lines (floor: 85%)
  - `size`: app entry 128.09 kB gzipped / 150 kB budget
- e2e: `npm run e2e` -> 41/41 passing, `evidence/g3-e2e-full.txt` and (post G4 fix)
  `evidence/g4-final-e2e.txt` - no regression in the login flow, header, guard redirects,
  or accessibility scans
- Pure structural refactor, no new/changed user-facing surface, no route or interaction
  behavior touched - existing e2e coverage of the login flow served as the regression guard
  rather than a new Playwright flow

## Reviews

- **Claude fresh-context review**: 1 finding, 0 blocking - `evidence/reviews/g4-claude-review.md`.
  Claude-1 (non-blocking): the six new enums were added into files that already export
  other symbols rather than each getting its own dedicated file like `SignInOutcome`.
  Accepted (user's decision): each enum is tightly coupled to the type/function declared
  alongside it (a discriminant used by one state-machine module), unlike `SignInOutcome`'s
  standalone shared taxonomy - splitting would fragment small, closely-related
  declarations across more files for no readability gain.
- **Codex second opinion**: 2 findings, 1 blocking - `evidence/reviews/g4-codex-review.md`.
  Codex-1 (blocking): `SessionUnreadableReason` was exported despite AC6's single-file-scope
  promise, and nothing outside `readSession.ts` consumed it. Fixed - `export` removed from
  both the const object and its derived type; re-verified green
  (`evidence/g4-final-verify.txt`, `evidence/g4-final-e2e.txt`); Codex confirmed RESOLVED in
  the same thread (`evidence/reviews/g4-codex-fix-confirmation.md`). Codex-2 (non-blocking):
  the nine step evidence `.txt` logs carry a trailing blank line `git diff --check` flags.
  Accepted (user's decision): cosmetic whitespace in captured command-output logs with no
  effect on content or correctness; the loop's evidence model treats a registered path as
  immutable, so recapturing under new filenames for a whitespace nit was not worth the churn.
- Security pass: not flagged for this loop (no auth-logic change, no new input-handling
  surface - pure import-path and literal-to-const-object restructuring).

## Known limitations / accepted findings

- **Claude-1 (accepted, not fixed)**: `LoginResultOutcome`/`LoginCardStateKind`
  (`loginCardState.ts`), `SessionStatus`/`SessionUnreadableReason` (`readSession.ts`),
  `SessionShadowStatus` (`sessionShadow.ts`) and `LookupOutcomeKind`
  (`lookupUserIdentifier.ts`) each live in the same file as the type/function that uses
  them as a discriminant, rather than each getting its own dedicated file per
  typescript-coding's one-symbol-per-file rule. These files already had multiple exports
  before this diff; user judged the coupling tight enough (state-machine module: enum +
  its discriminated union + the function that produces it) that splitting would add
  indirection without a readability benefit.
- **Codex-2 (accepted, not fixed)**: nine evidence log files under
  `specs/phase-2-conventions/evidence/steps/` carry a trailing blank line that
  `git diff --check` flags as whitespace noise. Cosmetic only, no content or correctness
  impact; left as-is per the evidence-immutability convention.
