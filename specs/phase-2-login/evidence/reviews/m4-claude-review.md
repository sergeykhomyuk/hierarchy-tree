# M4 boundary review - fresh-context Claude (agentic-loop:loop-reviewer)

Reviewed diff: `git diff 4880744..HEAD` at the time of review (the M3 boundary commit through the tip of `loop/feature/phase-2-login`, spanning commits `feca25d`, `892fac6`, `f05c058`) - the header's contents (`SignedInHeader`, `SignedInName`, `SignedInNameSkeleton`, `ResolvedSignedInName`, `SignedInAvatarPlaceholder`), signing out, the header e2e suite, and the live-smoke-discovered collection-fetch pivot (`fetchSignedInUser`, `parseSignedInUsers`, `usersCollectionResourcePath` replacing `userResourcePath`).

## Review Summary

Read the current working-tree state of every file the milestone touched, cross-checked against `specs/phase-2-login/PRODUCT.md` (invariants 94-104, 111, 113, 126, 97/97a-e), the relevant section of `TECH.md`, the last entry of `specs/ARCHITECTURE.md`'s decision log (2026-08-15, the whole-collection fetch strategy), and `loop.json`'s plan_steps 29-31.

**Verdict: 4 findings (0 blocking)** - all fixed and dispositioned before the milestone boundary closed.

### Findings

1. **Claude-10 - the numeric-id matching branch was untested in the gating suite.** `fetchSignedInUser.ts`'s `String(candidate.id) === String(userId)` match is deliberately type-coercing because the real database serves `id` as a JSON number while the secrets-lookup id can independently be a string or an int (`lookupResultSchema`). Every gating test used string ids on both sides; only the non-gating live suite exercised a real number. A regression narrowing the comparison to strict `===` would have passed every gate and silently reproduced the original production bug.
   Fixed: added `fetchSignedInUser.test.ts`'s "matches a numeric record id against a resolved id of the same value but a different JS type" test, verified via a differential check (temporarily narrowed the comparison to `candidate.id === userId`, confirmed only the new test failed while the other three stayed green, then restored).

2. **Claude-11 - axe never ran against the header's pending or neutral-fallback presentations.** `accessibility.spec.ts`'s header checks only ever observed the fully-resolved state (via `signIn()`, which resolves synchronously); invariant 111 asks for every state of the header, in both themes.
   Fixed: extracted `installDeferredUserMock`/`submitSignInForm` out of `header.spec.ts` into a shared `e2e/support/deferredUserMock.ts`, then added 4 new `accessibility.spec.ts` tests (pending + fallback, light + dark) - all pass with zero violations.

3. **Claude-12 - the live smoke suite's display-name proof reimplemented the app's own match/parse logic instead of calling it.** `live-smoke.test.ts`'s second case hand-rolled its own array `.find()` plus `signedInUserSchema.safeParse`, proving the schema fits the live payload's field names but not that `fetchSignedInUser` itself works against real data - a bug living inside that function or `parseSignedInUsers` could have passed this check while still breaking the real header.
   Fixed: rewrote the case to call the production `fetchSignedInUser` directly; the raw re-fetch-and-diagnose path (naming the field keys actually found) now only runs as a fallback when `fetchSignedInUser` returns `null`. Re-ran against the real database: 4/4 green.

4. **Claude-13 - a stale comment in `userIdentifier.ts` still referenced the deleted `userResourcePath` module.** Left over from before the collection-fetch pivot; would mislead a future reader into thinking an id still gets interpolated into a URL path.
   Fixed: comment now describes the current reality (storage + collection-comparison, no path interpolation), with a pointer to the ARCHITECTURE.md decision log entry.

### Things checked and found correct

- `userResourcePath.ts` is genuinely deleted with zero remaining references in `src/`.
- `parseSignedInUsers.ts` correctly tolerates bad rows (`flatMap` + `safeParse`, drops malformed elements, keeps the rest) and throws only when the top-level payload isn't an array - tested directly.
- `signedInUserSchema.ts` still strips `password` via Zod's default `strip` behavior, now alongside the required `id` join key.
- The three-presentation contract (invariant 99) is correctly split across `SignedInName`/`ResolvedSignedInName`/`SignedInNameSkeleton`/`SignedInAvatarPlaceholder`: the Suspense boundary and the suspending component are properly separated (React's own constraint), the failed-state avatar is genuinely static (no `animate-pulse`, not a reuse of the kit `Skeleton`), and box-size parity across all three presentations is asserted in both component tests and e2e `boundingBox()` comparisons.
- The logout control lives outside `SignedInName`'s Suspense boundary and stays enabled both while the name is pending and after it resolves to `null` (invariant 98).
- `handleLogout`'s sequencing (`beginInteraction` -> `clearSession` -> `analytics.track` -> `navigate({replace:true})`) shares one correlation id with the resulting `app.route_viewed` event via the interaction tracker, mirroring the pattern already fixed in M2 (Claude-5). `auth.signed_out`'s payload is exactly `{ correlationId }`.
- `createAuthenticatedLoader.ts` still returns `{ signedInUser: promise }` rather than a bare promise (no loader-blocks-navigation regression), confirmed by its own referential-equality test.
- The header e2e suite's synthetic `pageshow`/`persisted:true` dispatch correctly reaches `router.revalidate()` via `createBackForwardRestore` (wired in `bootstrap.ts`), which re-runs the authenticated loader and re-exercises the store's memoization (invariant 97b) - a legitimate proxy for "a second navigation" given phase 2 has only one authenticated route.
- The "does not return to an authenticated view with Back after signing out" test's history construction (`/login` -> replace to `/` on sign-in -> full-navigation push to `/?a=1` -> replace to `/login` on logout -> `goBack()`) is sound and backed by the pre-installed MutationObserver, proving `home.title` never mutates into the DOM during the interval (invariant 103's "ordinary path" half).
- `e2e/support/apiMocks.ts`, `signIn.ts`, `guard.spec.ts`, `login.spec.ts`, and `accessibility.spec.ts` are all correctly migrated to the collection-fetch mock shape (`page.route` on `/users.json` returning an array, matched by `id`) - no stale per-id mock plumbing left over.

## Post-review verification

npm run verify and npm run e2e both green after all four fixes: 41/41 e2e (up from 37 - the 4 new axe checks), full coverage/typecheck/lint/build/size all passing. Live smoke suite re-run against the real database: 4/4 green, now exercising the production `fetchSignedInUser` code path directly. Evidence: `evidence/milestones/m4-suite-post-review.txt`, `evidence/milestones/m4-e2e-post-review.txt`, `evidence/step31-live-smoke-post-review.txt`.
