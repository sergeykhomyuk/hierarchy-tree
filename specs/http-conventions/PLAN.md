# Plan: http-conventions - Extract enums in platform/http

## Brief
Mechanical convention-alignment refactor of `src/platform/http`, no behavior change, done on
top of `loop/feature/phase-2-login` before that branch merges (same pattern as
`phase-1-conventions` and `phase-2-conventions`). Three discriminant unions are raw
string-literal unions instead of the repo's `as const` object enum pattern (the model already
used correctly elsewhere: `SignInOutcome` in `platform/observability`, and the six enums
`phase-2-conventions` extracted in `features/auth`): `HttpResultOutcome` (`httpResult.ts`),
`HttpFailureKind` (`httpFailure.ts`), `AttemptOutcomeKind` (`performAttempt.ts`). Confirmed
with the user: `HttpRequest.method` (`'GET'|'POST'|'PUT'|'PATCH'|'DELETE'`) stays a plain
literal union - mirrors the HTTP spec 1:1, matching `phase-1-conventions`' documented
exclusion for unions that mirror an external platform API. `statusDescription()`'s return
values (`'server error'`/`'client error'`/`'error'`) stay plain strings - free-text labels,
never compared or branched on anywhere, not a discriminant. `HttpResultOutcome`'s literals are
also hardcoded at two call sites outside `platform/http` (`features/auth/data/
fetchSignedInUser.ts`, `lookupUserIdentifier.ts`) - confirmed in scope, since leaving them
as raw strings would defeat the point of centralizing the enum.

## Acceptance criteria
- AC1: `HttpFailureKind` (`network`/`timeout`/`http`/`parse`) becomes an `as const` object enum
  co-located in `httpFailure.ts`; `performAttempt.ts`, `createHttpClient.ts`, `shouldRetry.ts`
  reference the enum members instead of the raw literals. Behavior unchanged.
- AC2: `AttemptOutcomeKind` (`success`/`failure`/`aborted`) becomes an `as const` object enum
  co-located in `performAttempt.ts`; `createHttpClient.ts` references it. Behavior unchanged.
- AC3: `HttpResultOutcome` (`success`/`failure`/`cancelled`) becomes an `as const` object enum
  co-located in `httpResult.ts`; `createHttpClient.ts`, `features/auth/data/
  fetchSignedInUser.ts`, `features/auth/data/lookupUserIdentifier.ts` reference it instead of
  the raw literals. `platform/observability/timingRecord.ts`'s own `outcome` field type is
  untouched (out of scope - a different type in a different directory that happens to share
  two literal values); the enum's members still satisfy it structurally where passed in.

## Steps
1. `HttpFailureKind` const-object enum in `httpFailure.ts`; update `performAttempt.ts`,
   `createHttpClient.ts`, `shouldRetry.ts` - guarded by pre-existing tests (case c, `step na`):
   `src/platform/http/httpFailure.test.ts::HttpFailure > the failure union is exhaustive without a default branch`,
   `src/platform/http/shouldRetry.test.ts::shouldRetry > retries a GET network failure on the first attempt`,
   `src/platform/http/performAttempt.test.ts::performAttempt > reports a network failure when the transport rejects without an abort`
2. `AttemptOutcomeKind` const-object enum in `performAttempt.ts`; update `createHttpClient.ts` -
   guarded by pre-existing tests (case c, `step na`):
   `src/platform/http/performAttempt.test.ts::performAttempt > reports aborted (not network failure) when the transport rejects on an aborted signal`,
   `src/platform/http/createHttpClient.test.ts::createHttpClient > a caller abort yields cancelled without retrying or reporting an error`
3. `HttpResultOutcome` const-object enum in `httpResult.ts`; update `createHttpClient.ts`,
   `features/auth/data/fetchSignedInUser.ts`, `features/auth/data/lookupUserIdentifier.ts` -
   guarded by pre-existing tests (case c, `step na`):
   `src/platform/http/createHttpClient.test.ts::createHttpClient > returns success with the parsed value and status`,
   `src/features/auth/data/fetchSignedInUser.test.ts::fetchSignedInUser > resolves to null for every transport failure arm and warns once`,
   `src/features/auth/data/lookupUserIdentifier.test.ts::lookupUserIdentifier > maps every transport failure arm to the service-problem outcome`

## Verification
`npm run verify` (typecheck + lint + format:check + test:coverage + build + verify:build +
size) and `npm run e2e` must pass green at every step boundary - pure structural refactor, no
new user-facing surface, so existing e2e coverage of the login flow (which exercises the http
client end to end) is the relevant regression guard rather than a new Playwright flow.
Evidence: command output captured under `specs/http-conventions/evidence/`.
