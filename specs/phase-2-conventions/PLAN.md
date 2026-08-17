# Plan: phase-2-conventions - Align features/auth with coding conventions

## Brief
Mechanical convention-alignment refactor of `src/features/auth` (61 files), no behavior change,
done on top of `loop/feature/phase-2-login` before that branch merges. Two surfaces, both
confirmed with the user: (1) `domain/`, `data/`, `guard/` and `session/` are missing `index.ts`
barrels - the feature root's own `index.ts` and 13 internal cross-subdirectory imports deep-import
past folder boundaries instead of going through them, violating typescript-coding's barrel-export
rule; (2) six same-shape discriminant unions (`status`/`kind`/`reason` fields with 2+ literal
members) are typed as raw literal unions instead of the repo's established `as const` object
pattern (the model already used correctly for `SignInOutcome` in `platform/observability`).
Audited and explicitly left alone: analytics/log event-name strings (`'auth.sign_in_started'` etc.)
- wrapping only auth's in a const object would be a one-off inconsistency, since every other
event name in the app (`app.route_viewed`, `app.web_vital`, `app.error_boundary_shown`) is called
the same raw-literal way and none of them are wrapped either.

## Acceptance criteria
- AC1: `src/features/auth/domain/index.ts`, `data/index.ts`, `guard/index.ts`, `session/index.ts`
  each re-export their subdirectory's public surface (the symbols already consumed from outside
  the subdirectory - no export-surface expansion). The feature root `index.ts` and every internal
  cross-subdirectory import site (`useLoginSubmission.ts`, `guard/redirectSignedInVisitor.ts`,
  `guard/requireSession.ts`, `data/fetchSignedInUser.ts`, `data/lookupUserIdentifier.ts`,
  `data/secretResourcePath.ts`, `data/createSignedInUserStore.ts`, `data/lookupResultSchema.ts`,
  `session/sessionRecordSchema.ts`, `session/writeSession.ts`, `session/readSession.ts`,
  `session/sessionRecord.ts`) import through the barrel instead of a deep path. No behavior
  change; consumers outside `features/auth` are unaffected (they already import from `@features/auth`).
- AC2: `LoginCardStateKind` (`idle`/`ready`/`submitting`/`noMatch`/`serviceProblem`) and
  `LoginResultOutcome` (`untouched`/`noMatch`/`serviceProblem`) become `as const` object enums
  co-located in `loginCardState.ts`; `LoginPage.tsx`, `LoginAlert.tsx` and `useLoginSubmission.ts`
  reference the enum members instead of the raw literals. Rendered output/props contract unchanged.
- AC3: `SessionStatus` (`signedIn`/`signedOut`) becomes an `as const` object enum co-located in
  `session/readSession.ts`; `guard/requireSession.ts` and `guard/redirectSignedInVisitor.ts`
  reference it. Behavior unchanged.
- AC4: `SessionShadowStatus` (`unset`/`set`/`cleared`) becomes an `as const` object enum
  co-located in `session/sessionShadow.ts`; `session/readSession.ts` references it. Behavior
  unchanged.
- AC5: `LookupOutcomeKind` (`signedIn`/`noMatch`/`serviceProblem`/`cancelled`) becomes an `as
  const` object enum co-located in `data/lookupUserIdentifier.ts`; `useLoginSubmission.ts`
  references it. Kept independent from `platform/observability`'s `SignInOutcome` (different
  domain - a lookup-step result, not a settled analytics taxonomy - and a data-layer module has
  no reason to import from the observability platform module). Behavior unchanged.
- AC6: `SessionUnreadableReason` (`invalid_json`/`invalid_shape`/`wrong_version`) becomes an `as
  const` object enum co-located in `session/readSession.ts`, single-file scope. Behavior
  unchanged.

## Steps
1. `domain/index.ts` barrel (`deriveSecret`, `DerivedSecret`, `userIdentifier`, `UserIdentifier`,
   `USER_IDENTIFIER_PATTERN`); repoint `data/`, `guard/`, `session/` and root `index.ts` imports -
   guarded by pre-existing tests (case c, `step na`):
   `src/features/auth/domain/deriveSecret.test.ts::deriveSecret > matches the brief's own encode, position by position, for a hand-worked input`,
   `src/features/auth/domain/userIdentifier.test.ts::userIdentifier > accepts a finite integer and a conservative string alike`
2. `data/index.ts` barrel (`createSignedInUserStore`, `SignedInUserStore`, `SignedInUserView`,
   `lookupUserIdentifier`); repoint root `index.ts` and `useLoginSubmission.ts` - guarded by
   pre-existing tests (case c, `step na`):
   `src/features/auth/data/lookupUserIdentifier.test.ts::lookupUserIdentifier > issues exactly one request, to the secrets path`
3. `guard/index.ts` barrel (`resolveDestination`, `requireSession`, `redirectSignedInVisitor`,
   `withSessionGuard`, `isSessionGuarded`); repoint root `index.ts` - guarded by pre-existing tests
   (case c, `step na`):
   `src/features/auth/guard/requireSession.test.ts::requireSession > redirects a visitor with no session to the login route carrying from`,
   `src/features/auth/guard/redirectSignedInVisitor.test.ts::redirectSignedInVisitor > sends a signed-in visitor to the from target or the hierarchy route`
4. `session/index.ts` barrel (`clearSession`, `readSession`, `writeSession`); repoint root
   `index.ts`, `guard/redirectSignedInVisitor.ts`, `guard/requireSession.ts`,
   `useLoginSubmission.ts` - guarded by pre-existing tests (case c, `step na`):
   `src/features/auth/session/readSession.test.ts::readSession > returns the signed-in view for a well-formed record`
5. `LoginCardStateKind` + `LoginResultOutcome` const-object enums in `loginCardState.ts`; update
   `LoginPage.tsx`, `LoginAlert.tsx`, `useLoginSubmission.ts` call sites - guarded by pre-existing
   tests (case c, `step na`):
   `src/features/auth/loginCardState.test.ts::loginCardState > derives idle, ready, submitting, no-match and service-problem from the result and pending flags`,
   `src/features/auth/LoginPage.test.tsx::LoginPage > renders both fields read-only with their values while submitting`
6. `SessionStatus` const-object enum in `session/readSession.ts`; update
   `guard/requireSession.ts`, `guard/redirectSignedInVisitor.ts` - guarded by pre-existing tests
   (case c, `step na`):
   `src/features/auth/guard/requireSession.test.ts::requireSession > replaces the current entry on a direct load and pushes on an in-app navigation`
7. `SessionShadowStatus` const-object enum in `session/sessionShadow.ts`; update
   `session/readSession.ts` - guarded by pre-existing tests (case c, `step na`):
   `src/features/auth/session/readSession.test.ts::readSession > prefers the in-page shadow over a stale valid record left by a failed write`
8. `LookupOutcomeKind` const-object enum in `data/lookupUserIdentifier.ts`; update
   `useLoginSubmission.ts` - guarded by pre-existing tests (case c, `step na`):
   `src/features/auth/useLoginSubmission.test.tsx::useLoginSubmission > derives once and requests once when submitted twice in flight`
9. `SessionUnreadableReason` const-object enum in `session/readSession.ts` - guarded by
   pre-existing tests (case c, `step na`):
   `src/features/auth/session/readSession.test.ts::readSession > treats an unparseable, id-less or wrong-version record as no session and removes it`

## Verification
`npm run verify` (typecheck + lint + format:check + test:coverage + build + verify:build + size)
and `npm run e2e` must pass green at every step boundary - pure structural refactor, no new
user-facing surface, so existing e2e coverage of the login flow is the relevant regression guard
rather than a new Playwright flow. Evidence: command output captured under
`specs/phase-2-conventions/evidence/`.
