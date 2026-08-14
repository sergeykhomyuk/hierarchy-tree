# Plan: phase-2-login

## Brief

Turn the placeholder `/login` route into the real sign-in surface, and guard what sits behind
it. A user types an email and a password; the app derives a 64-character secret from them
client-side using the algorithm recovered from the brief, fetches only `GET
/secrets/{secret}.json`, and on a hit writes a tab-scoped session and lands the user on the
hierarchy page. A miss shows one combined message; a transport failure shows a different one,
with a retry and a correlation id. A loader guard runs before any data fetch and returns the
visitor to where they were headed. The authenticated view carries a header naming the signed-in
user with a logout affordance, and the back button cannot undo signing out.

Behavior is `PLAN.md`'s input, not its content: `PRODUCT.md` holds 146 numbered invariants and
`TECH.md` holds the design, the file layout and the test map. Every step below cites the
invariants its tests prove. Both specs passed G1 on 2026-08-14 after 44 findings.

## Acceptance criteria

Phase 2 is done when `specs/ROADMAP.md`'s exit criteria hold:

1. A real credential signs in and lands on the hierarchy page; a wrong one stays put and says
   why. (Invariants 6, 6a, 50-57, 66-71.)
2. The card's states match the mockups, with the one deliberate deviation recorded. (23-30,
   31-49, 50-65, 52.)
3. No credential material reaches any URL, log line, telemetry event or storage entry -
   asserted, not eyeballed. (12, 71, 76, 125, 128-132.)
4. The full pipeline is green: `npm run verify` and `npm run e2e`. (136-146.)

Plus the two the widened scope added:

5. Access control runs before data fetching and returns the visitor to where they were headed.
   (84-93.)
6. The header names the signed-in user and signs them out, and the back button cannot undo it.
   (94-104.)

## Milestones

Four, sequential. `TECH.md`'s milestone split is the source; this is its executable form.

**Fan-out decision: none. Run sequentially.** All four milestones edit the same five files -
`src/features/auth/index.ts`, `src/platform/observability/analyticsEvents.ts`,
`src/app/routing/routeDefinitions.ts`, `src/features/auth/locales/en/auth.json` and
`src/app/locales/en/common.json` - where a bad three-way merge fails silently: a dropped barrel
export fails the build, but a dropped analytics entry or catalogue key fails only whichever test
happens to reach it. The only pair that looks independent, M3 and M4, is not: M4's header renders
inside the layout route M3 creates. The wall-clock saving is not worth losing an enforcement edit
without noticing.

---

### M1 - The pieces below React

Everything that is pure or platform-level, plus the runtime fields the milestones above need.
No user-visible change, so **no e2e is claimed** - saying so is the point.

**Step 1 - The substitution table and its two identity checks.**
The 256-entry literal, a fixture derived from `docs/task.md`, and a recorded FNV-1a constant.
Proves the table has not drifted; invariant 6 is what proves it was right to begin with.
Invariants 5.
Tests:
- `src/features/auth/domain/substitutionTable.test.ts::the substitution table > has exactly 256 entries, every one an integer in 0-255`
- `src/features/auth/domain/substitutionTable.test.ts::the substitution table > matches the literal extracted from the brief, entry for entry`
- `src/features/auth/domain/substitutionTableChecksum.test.ts::substitutionTableChecksum > matches the recorded FNV-1a constant for the brief's table`

**Step 2 - `normalizeToCodeUnits`, transcribed byte-exact.**
Repeat-to-32 then truncate, returning `charCodeAt` values via the brief's code-POINT iteration -
so the array is 32 **or fewer**, with no padding and no repair. Invariants 3, 7.
Tests:
- `src/features/auth/domain/normalizeToCodeUnits.test.ts::normalizeToCodeUnits > cycles a short input to exactly 32 code units`
- `src/features/auth/domain/normalizeToCodeUnits.test.ts::normalizeToCodeUnits > keeps only the first 32 code units of a long input`
- `src/features/auth/domain/normalizeToCodeUnits.test.ts::normalizeToCodeUnits > returns fewer than 32 entries when an astral character survives truncation`

**Step 3 - `deriveSecret`.**
The XOR, the `& 0xff` reduction, the table index, the uppercase two-digit rendering, the
short-array tail where `undefined ^ x === x`, the trim deviation, and the empty-input rejection.
Expectations for the Unicode cases are computed by evaluating the brief's own `encode` rather
than written by hand. Invariants 1, 2, 4, 7, 8, 9, 10, 11, 12.
Tests:
- `src/features/auth/domain/deriveSecret.test.ts::deriveSecret > returns 64 characters drawn only from 0-9 and A-F`
- `src/features/auth/domain/deriveSecret.test.ts::deriveSecret > matches the brief's own encode, position by position, for a hand-worked input`
- `src/features/auth/domain/deriveSecret.test.ts::deriveSecret > preserves the brief's high-surrogate-only defect for a non-BMP character`
- `src/features/auth/domain/deriveSecret.test.ts::deriveSecret > drives the tail positions from the other input alone when the normalised array is short`
- `src/features/auth/domain/deriveSecret.test.ts::deriveSecret > trims the email and therefore differs from the brief's encode on boundary whitespace`
- `src/features/auth/domain/deriveSecret.test.ts::deriveSecret > uses the password exactly as typed, including a single space`
- `src/features/auth/domain/deriveSecret.test.ts::deriveSecret > rejects an empty email or password instead of looping`

**Step 4 - The branded identifier types and the user-id charset.**
`DerivedSecret`, `UserIdentifier`, and the parse-boundary restriction to `A-Za-z0-9_-` that
closes the traversal Codex found. Invariants 18a.
Tests:
- `src/features/auth/domain/userIdentifier.test.ts::userIdentifier > accepts a finite integer and a conservative string alike`
- `src/features/auth/domain/userIdentifier.test.ts::userIdentifier > rejects a traversal, a slash, a query character and a fragment character`

**Step 5 - The two resource paths, with the id percent-encoded.**
`secretResourcePath` and `userResourcePath`. Invariants 13, 15, 97.
Tests:
- `src/features/auth/data/secretResourcePath.test.ts::secretResourcePath > builds the secrets path for a derived secret`
- `src/features/auth/data/userResourcePath.test.ts::userResourcePath > percent-encodes the identifier into the path segment`

**Step 6 - `lookupResultSchema`.**
`null` means no match; a valid id means a hit; everything else is a service problem, never a
no-match. Invariants 16, 17, 18, 18a.
Tests:
- `src/features/auth/data/lookupResultSchema.test.ts::lookupResultSchema > reads a null body as no match`
- `src/features/auth/data/lookupResultSchema.test.ts::lookupResultSchema > reads a string and a number id as the same identifier`
- `src/features/auth/data/lookupResultSchema.test.ts::lookupResultSchema > rejects an object, an array, an empty string, a boolean and a fractional number`

**Step 7 - `lookupUserIdentifier`, the one request.**
Exactly one GET, nothing on the users path, failures mapped to the service-problem outcome,
cancellation neither an error nor a failure event, and a timeout producing one transport call
because the client returns from its aborted branch before `shouldRetry`. Invariants 13, 14, 19,
20, 21, 22, 124.
Tests:
- `src/features/auth/data/lookupUserIdentifier.test.ts::lookupUserIdentifier > issues exactly one request, to the secrets path`
- `src/features/auth/data/lookupUserIdentifier.test.ts::lookupUserIdentifier > maps a null body to no match without reporting an error`
- `src/features/auth/data/lookupUserIdentifier.test.ts::lookupUserIdentifier > maps every transport failure arm to the service-problem outcome`
- `src/features/auth/data/lookupUserIdentifier.test.ts::lookupUserIdentifier > makes one transport call on a timeout`
- `src/features/auth/data/lookupUserIdentifier.test.ts::lookupUserIdentifier > records no error-level entry and no settled event when the caller aborts`

**Step 8 - The redaction path-segment rule.**
`redact` scrubs keys and search params, which leaves `/secrets/<SECRET>.json` verbatim on every
timing record. A path-segment rule fixes it; `e2e/telemetry-buffer.spec.ts:26`'s pattern
assertion is replaced by the substring assertion the phase needs, because the old one would fail
on a correct implementation once the path reads `[redacted]`. Invariants 125.
Tests:
- `src/platform/observability/redact.test.ts::redact > replaces a secret-bearing path segment in a recorded resource path`
- `src/platform/observability/redact.test.ts::redact > leaves an ordinary resource path untouched`

**Step 9 - The storage port and the tab storage adapter.**
`KeyValueStorage`, `createTabStorage` as the single `sessionStorage` reader, and the
one-file lint override that permits it. Invariants 73, 75, 78.
Tests:
- `src/platform/runtime/createTabStorage.test.ts::createTabStorage > reads, writes and clears through the tab-scoped store`
- `src/platform/runtime/createTabStorage.test.ts::createTabStorage > reports unavailable storage as absent rather than throwing`

**Step 10 - The session store, shadow-first.**
Read, write and clear, with the in-page shadow authoritative over storage so a failed write over
an older valid record cannot authenticate the previous user and a failed removal cannot let a
signed-out visitor back in. Unparseable, wrong-version and throwing storage all mean no session.
Invariants 72, 76, 77, 78, 79, 79a.
Tests:
- `src/features/auth/session/readSession.test.ts::readSession > returns the signed-in view for a well-formed record`
- `src/features/auth/session/readSession.test.ts::readSession > treats an unparseable, id-less or wrong-version record as no session and removes it`
- `src/features/auth/session/writeSession.test.ts::writeSession > keeps the session readable for the page when persisting fails`
- `src/features/auth/session/readSession.test.ts::readSession > prefers the in-page shadow over a stale valid record left by a failed write`
- `src/features/auth/session/clearSession.test.ts::clearSession > reports no session after a failed removal rather than the cleared record`
- `src/features/auth/session/sessionRecord.test.ts::the session record > holds a user id and a schema version and nothing else`

**Step 11 - `resolveDestination`.**
The `from` validation that keeps this form from becoming an open redirect. Invariants 67, 68,
69, 92.
Tests:
- `src/features/auth/guard/resolveDestination.test.ts::resolveDestination > returns the from target when it is a same-origin path`
- `src/features/auth/guard/resolveDestination.test.ts::resolveDestination > falls back to the hierarchy route for a protocol-relative, scheme-carrying or backslash-escaped value`
- `src/features/auth/guard/resolveDestination.test.ts::resolveDestination > keeps an unserved same-origin path rather than rewriting it`

**Step 12 - The signed-in user store and its fetch half.**
The factory, its memo by id, and a `read` whose promise never rejects: every `HttpResult`
failure arm and a `null` body resolve to `null` with one warning, because a rejection would
reach the route error boundary and produce exactly the error page invariant 97c forbids. The
schema drops `password` at the boundary. Invariants 97, 97a, 97b, 97c.
Tests:
- `src/features/auth/data/signedInUserSchema.test.ts::signedInUserSchema > drops the password field at the parse boundary`
- `src/features/auth/data/fetchSignedInUser.test.ts::fetchSignedInUser > resolves to null for every transport failure arm and warns once`
- `src/features/auth/data/createSignedInUserStore.test.ts::createSignedInUserStore > requests a given user once and reuses the promise`

**Step 13 - The runtime fields and the test fakes.**
`createRuntime` gains `tabStorage` and `signedInUserStore`; `renderRoute` gains fakes for both.
They land here, not where they are first read, because M2's sign-in e2e cannot go green without
storage reaching the page and `writeSession` is deliberately off the barrel.
Tests:
- `src/app/composition/createRuntime.test.ts::createRuntime > exposes tab storage and the signed-in user store`

**Step 14 - The three guard narrowings, with their demonstrable negatives.**
The `/secrets` literal ban gains a whole-scope path allow-list (a new mechanism -
`FILE_ALLOWLIST` governs exported vocabulary only and never reaches the literal check); the
`sessionStorage` ban gains a one-file override; both guard-script test suites are updated in the
same change. Each narrowing is proven still to fire everywhere else. Invariants 141.
Tests:
- `scripts/guard-scripts.test.ts::assert-domain-vocabulary > allows the /secrets literal only in the one file that builds the path`
- `scripts/guard-scripts.test.ts::assert-domain-vocabulary > still rejects a /secrets literal in any other file`
- `scripts/eslint-configuration.test.ts::the boundaries policy > permits sessionStorage only in createTabStorage`

**M1 boundary:** `npm run verify` green as a whole chain, the new `domain` directory holding the
100% threshold `vitest.config.ts` arms automatically, and the two demonstrable negatives captured
as evidence and reverted.

---

### M2 - The login card and its five states

**Step 15 - The catalogue and the analytics events.**
The auth namespace rewritten (including `serviceProblemCorrelationLabel` - invariant 58 renders
a 32-hex id and a bare one with nothing naming it is unusable), the three typed events, and
`beginInteraction` on the interaction tracker. Invariants 116, 117, 118, 121, 126.
Tests:
- `src/features/auth/loadTranslations.test.ts::loadTranslations > registers every key the login card renders`
- `src/platform/observability/analyticsEvents.test.ts::the analytics catalogue > carries the three sign-in events with their payloads`

**Step 16 - The three additive kit changes.**
`Input` gains `readOnly` and `placeholder`; `Button` gains busy-spinner support and the pressed
fill. All approved under invariant 141 as findings raised rather than slipped in. Invariants 41,
106, 114, 115, 141.
Tests:
- `src/shared/ui/Input.test.tsx::Input > renders read-only without leaving the accessibility tree`
- `src/shared/ui/Input.test.tsx::Input > renders a placeholder that is not the field's accessible name`
- `src/shared/ui/Button.test.tsx::Button > renders a spinner and the pressed fill while busy`

**Step 17 - `loginCardState`, the pure state function.**
The five states as a derived value rather than ad-hoc booleans. Invariants 29, 31, 32, 33.
Tests:
- `src/features/auth/loginCardState.test.ts::loginCardState > derives idle, ready, submitting, no-match and service-problem from the result and pending flags`

**Step 18 - `useLoginSubmission`.**
The submission driver: one derivation and one request per submission, guarded in `onSubmit`
because `useActionState` queues a second dispatch rather than dropping it; the stale alert
cleared as the attempt starts; abort on unmount and on `pageshow`. Invariants 43, 45, 47, 48,
48a, 121, 122, 123, 124.
Tests:
- `src/features/auth/useLoginSubmission.test.ts::useLoginSubmission > derives once and requests once when submitted twice in flight`
- `src/features/auth/useLoginSubmission.test.ts::useLoginSubmission > clears a previous alert as the next attempt starts`
- `src/features/auth/useLoginSubmission.test.ts::useLoginSubmission > aborts in flight without a state update when the page unmounts`

**Step 19 - `LoginPage`: idle, ready and submitting.**
The card, the mark, the fields, the disabled control while either field is empty, and the
submitting state's read-only fields and busy button. Invariants 23, 24, 25, 26, 27, 31-42, 105,
106, 107, 114, 115.
Tests:
- `src/features/auth/LoginPage.test.tsx::LoginPage > renders the empty card with the Login control absent from the tab order`
- `src/features/auth/LoginPage.test.tsx::LoginPage > enables the control once both fields are non-empty and disables it again when one empties`
- `src/features/auth/LoginPage.test.tsx::LoginPage > leaves the control inert for a whitespace-only email`
- `src/features/auth/LoginPage.test.tsx::LoginPage > renders both fields read-only with their values while submitting`
- `src/features/auth/LoginPage.test.tsx::LoginPage > submits on Enter pressed inside either field`

**Step 20 - The no-match state.**
The summary alert, both fields marked invalid with no field-level attribution, values preserved,
the alert announced without moving focus, and the alert persisting through edits. Invariants
50-57, 108, 109.
Tests:
- `src/features/auth/LoginPage.test.tsx::LoginPage > shows the summary alert and marks both fields invalid on a null lookup`
- `src/features/auth/LoginPage.test.tsx::LoginPage > renders no field-level message under either field`
- `src/features/auth/LoginPage.test.tsx::LoginPage > preserves both typed values, password included, after a failed attempt`
- `src/features/auth/LoginPage.test.tsx::LoginPage > moves focus nowhere when the alert appears`

**Step 21 - The service-problem state and its retry.**
The distinct alert, the correlation id and its label, the retry control, neither field marked
invalid, and the focus handoff to the busy Login control when retry unmounts the element holding
focus. Invariants 58-65, 110.
Tests:
- `src/features/auth/LoginPage.test.tsx::LoginPage > shows the service-problem alert with its correlation id and marks neither field invalid`
- `src/features/auth/LoginPage.test.tsx::LoginPage > re-derives from the current field values when retry is activated`
- `src/features/auth/LoginPage.test.tsx::LoginPage > hands focus to the busy Login control when the retry control unmounts`

**Step 22 - The route wrapper, the success path, and the login e2e.**
`LoginRoute.tsx` injects the dependencies including `navigate`; success writes the session and
navigates with `replace`. The e2e exercises all five states against route mocks, asserts one
request to the secrets path and none on the users path during the authentication window, and
asserts the telemetry buffer holds no credential material. Invariants 66, 70, 71, 13, 14, 125,
128, 130, 111.
Tests:
- `e2e/login.spec.ts::the login card > signs in with a real-shaped credential and lands on the hierarchy page`
- `e2e/login.spec.ts::the login card > shows the no-match alert for a null lookup and stays on /login`
- `e2e/login.spec.ts::the login card > shows the service-problem alert and retries successfully`
- `e2e/login.spec.ts::the login card > issues exactly one request while authenticating, and none on the users path`
- `e2e/login.spec.ts::the login card > leaves no credential material in the telemetry buffer or storage`
- `e2e/login.spec.ts::the login card > passes an accessibility scan in each of its five states`

**Step 23 - Migrate the five existing assertions about the login placeholder.**
This milestone deletes `AuthPlaceholderPage` and its catalogue keys, so `login.title`,
`login.documentTitle` and the literal "Sign in isn't built yet" stop existing. Named because
M2's boundary claims a green `npm run e2e` and M3's migration list covers the guard's victims,
not these. Invariants 136, 140.
Tests:
- `e2e/placeholder-routes.spec.ts::the placeholder routes > the login route renders the sign-in card`
- `e2e/accessibility.spec.ts::accessibility > has no violations on /login`

**M2 boundary:** `npm run verify` and `npm run e2e` both green, with the component suite covering
all five states, the keyboard contract and axe.

---

### M3 - The guard, the router, and the authenticated shell

**Step 24 - `requireSession` and `redirectSignedInVisitor`.**
The guard pair, with the redirect action chosen per navigation - replace when the guarded URL is
already the current entry, push on an in-app link click, because forcing replace there overwrites
the entry the visitor came from. Invariants 84, 87, 88, 89, 91, 93.
Tests:
- `src/features/auth/guard/requireSession.test.ts::requireSession > redirects a visitor with no session to the login route carrying from`
- `src/features/auth/guard/requireSession.test.ts::requireSession > replaces the current entry on a direct load and pushes on an in-app navigation`
- `src/features/auth/guard/redirectSignedInVisitor.test.ts::redirectSignedInVisitor > sends a signed-in visitor to the from target or the hierarchy route`

**Step 25 - `withSessionGuard`.**
The loader wrapper, built now against invariant 146's one named exception, because React Router
runs matched loaders in parallel and phase 3's fetch would otherwise start before the parent's
redirect landed. Invariants 85, 146.
Tests:
- `src/features/auth/guard/withSessionGuard.test.ts::withSessionGuard > runs the session check before the wrapped loader and skips it entirely on redirect`
- `src/app/routing/routeDefinitions.test.ts::the route definitions > wrap every guarded route's loader in withSessionGuard`

**Step 26 - The authenticated layout route and the router wiring.**
`routeDefinitions(runtime)`, the pathless layout route, `AuthenticatedLayout` and its
`authenticatedLoader` returning `{ signedInUser: store.read(userId) }` inside an object - never
the bare promise, which react-router would await, deleting the skeleton. Invariants 86, 90, 100,
136, 137.
Tests:
- `src/app/routing/routeDefinitions.test.ts::the route definitions > keep the route set at home, login and not-found`
- `src/app/layout/AuthenticatedLayout.test.tsx::AuthenticatedLayout > returns the signed-in user promise without awaiting it`

**Step 27 - `createBackForwardRestore`.**
The `pageshow` revalidation that keeps a restored authenticated document from staying visible.
Invariants 103.
Tests:
- `src/app/routing/createBackForwardRestore.test.ts::createBackForwardRestore > revalidates when a persisted page is restored`

**Step 28 - Migrate the seven e2e specs the guard breaks, and the guard e2e.**
Every existing spec that visits `/` unauthenticated, plus the four guard flows and the hostile
`from` values. Invariants 84-93, 137, 143.
Tests:
- `e2e/guard.spec.ts::the route guard > sends a bookmarked authenticated URL to the login card with no users request and no flash`
- `e2e/guard.spec.ts::the route guard > lands on the bookmarked path after signing in from the redirect`
- `e2e/guard.spec.ts::the route guard > bounces a signed-in visitor straight off the login route`
- `e2e/guard.spec.ts::the route guard > returns Back from the login card to where the visitor came from`
- `e2e/guard.spec.ts::the route guard > ignores a protocol-relative or backslash-escaped from value`

**M3 boundary:** `npm run verify` and `npm run e2e` green, with the size-limit and build-output
declarations updated for the new authenticated-layout chunk.

---

### M4 - The header's contents and signing out

**Step 29 - `SignedInName` and the avatar placeholder.**
The three presentations - skeleton while resolving, name and initials when resolved, and a
static neutral placeholder when it never resolves. Static, not the kit `Skeleton`, whose
`animate-pulse` would pulse forever in a settled state and whose `aria-hidden` would remove it
from the accessibility tree. The promise arrives as a prop, so these are component tests without
a data router. Invariants 96, 99, 100.
Tests:
- `src/app/layout/SignedInName.test.tsx::SignedInName > renders the skeleton while the name is resolving`
- `src/app/layout/SignedInName.test.tsx::SignedInName > renders the full name and its initials once resolved`
- `src/app/layout/SignedInName.test.tsx::SignedInName > renders a static placeholder, not the pulsing skeleton, when the name never resolves`
- `src/app/layout/SignedInName.test.tsx::SignedInName > reserves the same box in all three presentations`

**Step 30 - `SignedInHeader` and signing out.**
The header bar, the logout control operable by Enter and Space, the session cleared and the
login card rendered idle, and sign-out safe when there is no session. Invariants 94, 95, 98,
101, 102, 104, 126.
Tests:
- `src/app/layout/SignedInHeader.test.tsx::SignedInHeader > renders the eyebrow, the title, the name and the logout control`
- `src/app/layout/SignedInHeader.test.tsx::SignedInHeader > keeps logout operable before a name is known and when one never arrives`
- `src/app/layout/SignedInHeader.test.tsx::SignedInHeader > clears the session and returns to the login route`

**Step 31 - The header e2e and the live header proof.**
The resolving skeleton, the resolved name, the failed-resolution presentation with the page
beneath still rendered, one user request across two authenticated navigations, the keyboard path
from typing credentials through to activating logout, axe in both themes, and Back after signing
out. Plus the live case that proves the header can resolve a real name through the real schema -
without which the implementation could pass every gate and always show the fallback. Invariants
97b, 97e, 103, 111, 113.
Tests:
- `e2e/header.spec.ts::the signed-in header > shows the skeleton, then the resolved name and initials`
- `e2e/header.spec.ts::the signed-in header > renders the neutral presentation and the page beneath when the name cannot resolve`
- `e2e/header.spec.ts::the signed-in header > requests the user record once across two authenticated navigations`
- `e2e/header.spec.ts::the signed-in header > signs in and out entirely from the keyboard`
- `e2e/header.spec.ts::the signed-in header > does not return to an authenticated view with Back after signing out`
- `scripts/live-smoke/live-smoke.test.ts::live smoke > derives a real account's secret and resolves it to that account's id`
- `scripts/live-smoke/live-smoke.test.ts::live smoke > resolves the signed-in user's display name through the real schema`

**M4 boundary:** `npm run verify` and `npm run e2e` green; the live suite run separately and its
output captured.

---

## Verification

Per `VERIFICATION.md`. `npm run verify` is the gating chain (typecheck, lint, format, coverage,
build, build-output assertions, size) and `npm run e2e` the Playwright run; both at every
milestone boundary from M2 onward, `npm run verify` alone at M1. The live suite
(`npm run smoke:live`) is never gating and runs explicitly at M4.

Evidence lands under `specs/phase-2-login/evidence/`: per-step red logs, per-milestone boundary
records (`milestones/m<N>-suite.txt`, `m<N>-e2e.txt`), the demonstrable negatives from step 14,
Playwright traces for the five card states and the guard flows, and the review records already
there from G1.
