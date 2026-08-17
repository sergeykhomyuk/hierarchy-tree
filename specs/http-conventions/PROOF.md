# Proof of completion: http-conventions

## Task

Align `src/platform/http` with the `typescript-coding` skill's conventions before
`phase-2-login` merges: extract its three raw string-literal discriminant unions into
`as const` object enums matching the repo's `SignInOutcome`/`phase-2-conventions`
precedent, and repoint the two `features/auth` call sites that hardcoded the same
literals. Strict behavior-preservation contract throughout - zero functional change,
structural only. Scope confirmed with the user via AskUserQuestion at triage: `HttpRequest.
method` and `statusDescription()`'s return values excluded (external-API mirror /
free-text label, neither a discriminant); `platform/observability/timingRecord.ts`'s own
`outcome` field left untouched (different domain, shares two literal values by
coincidence, not meant to be coupled).

## Requirements -> evidence

- **AC1: `HttpFailureKind` (`network`/`timeout`/`http`/`parse`) becomes an `as const`
  object enum co-located in `httpFailure.ts`; `performAttempt.ts`, `createHttpClient.ts`,
  `shouldRetry.ts` reference it instead of the raw literals.**
  - Step 1, tests: `HttpFailure > the failure union is exhaustive without a default
    branch`, `shouldRetry > retries a GET network failure on the first attempt`,
    `performAttempt > reports a network failure when the transport rejects without an
    abort` - passing (case c, na)
  - `evidence/steps/step1-green.txt`

- **AC2: `AttemptOutcomeKind` (`success`/`failure`/`aborted`) becomes an `as const`
  object enum co-located in `performAttempt.ts`; `createHttpClient.ts` references it.**
  - Step 2, tests: `performAttempt > reports aborted (not network failure) when the
    transport rejects on an aborted signal`, `createHttpClient > a caller abort yields
    cancelled without retrying or reporting an error` - passing (case c, na)
  - `evidence/steps/step2-green.txt`

- **AC3: `HttpResultOutcome` (`success`/`failure`/`cancelled`) becomes an `as const`
  object enum co-located in `httpResult.ts`; `createHttpClient.ts`,
  `features/auth/data/fetchSignedInUser.ts`, `features/auth/data/
  lookupUserIdentifier.ts` reference it instead of the raw literals; added to the
  `platform/http` barrel since it's now consumed cross-directory;
  `platform/observability/timingRecord.ts`'s own `outcome` field type left untouched.**
  - Step 3, tests: `createHttpClient > returns success with the parsed value and
    status`, `fetchSignedInUser > resolves to null for every transport failure arm and
    warns once`, `lookupUserIdentifier > maps every transport failure arm to the
    service-problem outcome` - passing (case c, na)
  - `evidence/steps/step3-green.txt`

## Verification summary

- Full suite: `npx vitest run` -> green at every step boundary, 108 files / 430 tests
- Full CI verify chain: `npm run verify` (typecheck + lint + format:check + test:coverage
  + build + verify:build + size) -> green end-to-end, `evidence/g3-verify-full.txt`
- e2e: `npm run e2e` -> 41/41 passing, `evidence/g3-e2e-full.txt` - no regression in the
  login flow, which exercises the http client end to end
- Pure structural refactor, no new/changed user-facing surface, no route or interaction
  behavior touched - existing e2e coverage served as the regression guard rather than a
  new Playwright flow

## Reviews

- **Claude fresh-context review**: CLEAN, 0 findings - `evidence/reviews/g4-claude-review.md`.
  Verified enum value fidelity (all 10 members across the 3 enums checked against their
  original literals), every consumer call site swapped 1:1 with no inversions, all three
  deliberate exclusions held, both features/auth call sites fully repointed with no
  leftover raw literals, and no new typescript-coding convention deviation (the
  enum+type colocation pattern matches the repo's own established precedent).
- **Codex second opinion**: unavailable - the background review job did not complete
  within the session after ~10 minutes and one resume attempt. Logged per the
  unavailability fallback (`loop log http-conventions "codex unavailable at G4: ..."`);
  user explicitly approved proceeding single-reviewer.
- Security pass: not flagged for this loop (no auth-logic change, no new
  input-handling surface - pure literal-to-const-object restructuring).

## Known limitations / accepted findings

None - the fresh-context Claude review returned CLEAN with zero findings, and no
Codex findings exist to disposition (second opinion unavailable, user-approved).
