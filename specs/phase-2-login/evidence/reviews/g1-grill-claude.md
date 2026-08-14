# G1 adversarial grill - Claude (fresh context, read-only)

Loop: phase-2-login (feature/L). Gate G1. Date: 2026-08-14.
Reviewer: `agentic-loop:loop-spec-validator` in grill mode, spawned by the driving
session, with no access to the contexts that wrote PRODUCT.md or TECH.md.
Material: `specs/phase-2-login/PRODUCT.md` and `specs/phase-2-login/TECH.md`.

Saved verbatim as it was returned.

---

## Verdict

**19 findings (7 blocking)**

---

### 1. Invariant 7 states the opposite of what the brief's algorithm actually does for non-BMP input — BLOCKING

*PRODUCT.md invariant 7; TECH.md §2 (`normalizeToCodeUnits`); test map entry "7".*

Invariant 7: *"A non-BMP character contributes its **surrogate code units individually**, and the 32-unit truncation may split a surrogate pair. This is the brief's algorithm and is preserved exactly; matching the original's bytes outranks producing 'correct' Unicode handling."*

The brief's `make32` (`/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/docs/task.md:37-45`) ends with:

```js
return Array.from(resultString, (char) => char.charCodeAt(0));
```

`Array.from` over a string iterates by **code point**, not code unit. A non-BMP character yields **one** element (a 2-code-unit string) whose `charCodeAt(0)` is the **high surrogate only**; the low surrogate is discarded. The returned array is therefore **shorter than 32** whenever an astral character survives the `substring(0, 32)`. The `for (let i = 0; i < 32; ++i)` loop then reads `undefined` at the tail positions, and `undefined ^ x` evaluates to `x` (ToInt32(NaN) = 0) — producing bytes nothing in these specs describes.

TECH.md §2 specifies the opposite: *"`normalizeToCodeUnits` repeats the input end to end until it is at least 32 UTF-16 code units long, keeps the first 32, and returns their `charCodeAt` values - the brief's `make32` with a name that is not the brief's."* That returns 32 values **always**. Its declared return type `readonly number[]` and invariant 4's "each of the 32 positions" both bake in the wrong shape.

Why it matters: the test map for invariant 7 says *"a non-BMP character asserted to contribute two surrogate code units ... asserted to produce the brief's bytes rather than a replacement character."* That test would encode a **false** expectation as "the brief's bytes" and go green on a derivation that does not match the original. This is exactly the silent-failure mode invariants 5/6 exist to guard against, and the live proof (invariant 6a) will not catch it because real emails and passwords are ASCII.

Resolution: either transcribe `Array.from`'s code-point iteration verbatim (accepting a sub-32 array and the `undefined ^ x` tail) or restate invariant 7 as a knowing deviation from the brief with the byte difference named.

---

### 2. Invariant 84's `from` cannot carry the hash — React Router strips it before a loader ever sees the URL — BLOCKING

*PRODUCT.md invariant 84; TECH.md §5.3 `requireSession`.*

Invariant 84: *"...carrying the requested path, **search and hash** as the `from` value."* TECH.md §5.3: *"it builds `` `${url.pathname}${url.search}${url.hash}` `` from `request.url`."*

`request.url` in a loader is built by `/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/node_modules/react-router/dist/development/lib/router/router.js:2604-2605`:

```js
function createClientSideRequest(history, location, signal, submission) {
	let url = history.createURL(stripHashFromPath(location)).toString();
```

and `stripHashFromPath` (`router.js:2762-2767`) sets `hash: ""`. So `new URL(request.url).hash` is **always the empty string**. The stated mechanism cannot satisfy the stated invariant, and no test in the map would notice — the guard map (84/85/86) only asserts `/login?from=%2F`, a path with no fragment.

Why it matters: a visitor bookmarking `/#team-3` is silently returned to `/` after sign-in, and the implementer will write `url.hash` believing it works.

Resolution: drop "hash" from invariant 84 (and from invariant 92's promise) or specify reading `window.location.hash` in the guard with the pending-navigation caveat stated.

---

### 3. `replace()` in `requireSession` destroys the referring history entry on a client-side navigation, breaking invariant 87 — BLOCKING

*PRODUCT.md invariant 87; TECH.md Context ("React Router's redirect semantics") and §5.3.*

TECH.md: *"`replace` rather than `redirect` is the whole of invariant 87"*, applied unconditionally.

The block comment TECH.md itself cites (`router.js:981-999`) says the opposite for the PUSH case: *"we also do not update history until the end of the navigation (including processed redirects). This means that we never actually touch history until we've processed redirects, so we just use the history action from the original navigation (PUSH or REPLACE)."* Combined with `router.js:1024` (`X-Remix-Replace` → `"REPLACE"`), an in-app link click to a guarded URL becomes:

- visitor is on page A, clicks a `Link` to `/` (guarded)
- `/` never gets a history entry (correct, per the comment)
- the redirect is forced to **REPLACE**, so `/login?from=%2F` **overwrites A's entry**

Back from the login card then lands on whatever preceded A — the direct negation of invariant 87 (*"Back from the login card returns to wherever the visitor actually came from"*). Plain `redirect()` (PUSH) is correct for this case; `replace()` is correct only for the initial load and POP. One unconditional choice cannot satisfy both.

This is not hypothetical: `/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/e2e/not-found.spec.ts:18-24` already performs exactly this PUSH (`notFound.linkHome` → `/`).

TECH's own check does not discriminate it: M3's invariant-87 e2e is *"navigate to a third-party-free start page, then to the guarded URL, then press Back"* — if that second navigation is a `page.goto`, it is a document load and `replace` is right, so the test passes while the in-app path is broken.

Resolution: make the redirect action depend on the navigation type (replace on initial load/POP, push otherwise), and add the link-click variant to the invariant-87 e2e.

---

### 4. Invariant 14 and invariant 97 directly contradict each other, and TECH's check for 14 must fail once M4 lands — BLOCKING

*PRODUCT.md invariants 14 and 97; TECH.md test map "13, 14, 128" and "97, 97d".*

Invariant 14: *"The users collection is never requested during authentication - not the whole database, not the users path, **not a single user record**. A sign-in flow's network log contains the secrets request and **nothing else** from this application's origin."*

Invariant 97: the header fetches *"that one user's record, by id, after authentication has already succeeded"* — i.e. `GET /users/<id>.json`, which is a single user record on the users path, issued as part of the sign-in flow (the `authenticatedLoader` runs on landing).

Invariant 97's prose asserts the conflict away (*"This does not reopen invariant 14"*), but invariant 14's own text is never amended, and the two mechanical checks are irreconcilable:

- 13/14/128: *"`page.on('request')` collects every request **during a full sign-in**, and the test asserts **exactly one request** to the API origin ... and that **no request path contains `users`**."*
- 97/97d: *"**exactly one request to `/users/<id>.json` after sign-in**."*

M2 delivers the first check and it goes green (no header yet). M4 delivers the header and the first check **must** go red. Nothing in the milestone plan says the M2 assertion is rewritten in M4.

Resolution: rewrite invariant 14 to bound its network claim to the window that ends at the successful lookup, and restate the 13/14/128 check against that window.

---

### 5. The guard breaks six existing e2e specs; M3's "`npm run e2e` green" and invariant 143's check cannot both hold — BLOCKING

*TECH.md "Milestone split" M3; test map entry "143"; PRODUCT.md invariants 137, 143.*

Guarding `/` invalidates every existing spec that visits it unauthenticated:

- `/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/e2e/placeholder-routes.spec.ts:13-29` and `:55-67`
- `/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/e2e/telemetry-buffer.spec.ts:11-14` and `:35-38`
- `/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/e2e/accessibility.spec.ts:6` (`{ path: '/', heading: 'home.title' }`)
- `/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/e2e/right-to-left.spec.ts:35` (same)
- `/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/e2e/not-found.spec.ts:20-24` (clicks the home link, asserts `home.title`)
- `/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/e2e/deployed-smoke.spec.ts:11-18, 20-34` (asserts the literal placeholder prose on `/` **and** on `/login`, both of which change)

TECH.md's M3 deliverables list mentions only `.size-limit.json` and `expected-build-output.json`. Worse, the test map for invariant 143 claims *"`HierarchyPlaceholderPage.tsx` is byte-unchanged, asserted by **the existing placeholder tests still passing untouched**"* — `placeholder-routes.spec.ts` is one of those tests and cannot pass untouched.

Related: invariant 137 says *"The not-found route's content and behaviour are **unchanged**"*, but its home link now bounces a signed-out visitor to `/login`. That behaviour change is nowhere specified.

Resolution: add the six spec migrations to M3's deliverables and reword invariants 137 and 143's check to cover the new redirect behaviour.

---

### 6. M2's claimed verification cannot go green with only M1 delivered — BLOCKING

*TECH.md "Milestone split", M2 ("Depends on M1 for the derivation, the lookup and the session write") vs M3 ("`createRuntime`'s `tabStorage` field").*

M2 delivers the login page and *"On success it writes the session and navigates with `replace`"*, and claims an e2e that performs a real sign-in. Writing the session needs a `KeyValueStorage` instance reaching the page. TECH.md §5.1 says that instance comes from `createRuntime`: *"`createRuntime.ts` gains two fields - `tabStorage: KeyValueStorage` from `createTabStorage()`, and `signedInUserStore`"* — and the milestone list schedules **`createRuntime`'s `tabStorage` field in M3**. `writeSession` is also deliberately not on the barrel (§1.1: *"Not exported, deliberately: ... `writeSession`"*), so `app` cannot reach it either.

Also note the corollary for M2's e2e: a real sign-in in M2 writes a `sessionStorage` entry, and `telemetry-buffer.spec.ts:44-50` asserts `sessionStorageLength === 0` after visiting both routes — M2 must narrow that assertion, which TECH schedules under invariant 75 without naming a milestone.

Resolution: move `createRuntime`'s `tabStorage` field (and the `renderRoute` fake) into M1 or M2.

---

### 7. Activating retry destroys the focused control, and invariant 110 forbids exactly that with no mechanism specified — BLOCKING

*PRODUCT.md invariants 45, 59, 60, 105, 110; TECH.md §7.*

Invariant 110: *"Focus is never lost to the document body by any state transition on this page: not on submit, not on failure, **not on retry**, not on the alert appearing or clearing."*

The retry control lives inside the service-problem alert (invariant 105: *"then any control inside a visible alert"*). Invariant 45 / TECH §7: *"the result is set to `{ outcome: 'untouched' }` before the derivation runs, so a stale alert is gone the instant a new attempt starts."* So pressing retry unmounts the alert — and with it the button that currently holds focus — and focus falls to `document.body`.

Nothing in TECH.md specifies where focus goes. Invariant 44 (*"Focus is never dropped to the document body by the transition into or out of this state"*) has the same hole. The proposed check ("asserting `document.activeElement !== document.body` after every transition") would catch it, so the spec's check is right and its design is missing.

Resolution: state where focus moves when the retry control unmounts (e.g. programmatically to the Login control as it enters the busy state).

---

### 8. Invariants 44 and 55 assume the user submitted from the Login control, contradicting invariant 107 — non-blocking

*PRODUCT.md invariants 44, 55, 107.*

Invariant 107 makes Enter inside either field a submission path. Invariant 55 then asserts *"Focus stays on the Login control **where the user left it**"*, and invariant 44 *"The control keeps its accessible name and **its focus** while busy."* When the user submits with Enter from the email field, focus is on the email field, not the control. TECH's checks repeat the assumption: *"55, 64, 108 - component: ... focus is on the control before and after it appears"* and *"44 - component: `document.activeElement` is the control across the transition"*.

An implementer reading 44 literally will move focus to the control on submit, which invariant 55's *"without moving focus"* forbids.

Resolution: reword 44 and 55 as "focus does not move as a result of the transition", independent of where it was.

---

### 9. The `/secrets` file allow-list TECH proposes does not exist in the shape it claims — non-blocking

*TECH.md §3, and M1's deliverables.*

TECH.md: *"`scripts/assert-domain-vocabulary.mjs:159-161`'s blanket ban becomes a `FILE_ALLOWLIST` entry for this one path, **in the same shape the script already uses for `redact.ts` (lines 44-48)**."*

`FILE_ALLOWLIST` maps a file path to a set of banned **words** and is read only inside `checkExportedVocabulary` (`/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/scripts/assert-domain-vocabulary.mjs:119, 126`). The `/secrets` check is a **literal substring** check inside a different function, `checkWholeScopeVocabulary` (lines 159-161), which never consults `FILE_ALLOWLIST`:

```js
if (source.includes('/secrets')) {
  violations.push(`${filePath}: string literal contains "/secrets"`);
}
```

The narrowing therefore requires a new mechanism, not an entry in an existing map. Minor in effort, but it is a grounded-looking claim that is false, and M1's "demonstrable negative" evidence depends on it.

Resolution: say that `checkWholeScopeVocabulary` gains its own path allow-list for the literal check.

---

### 10. The `redirect` import ban lives in two ESLint blocks; TECH narrows only one, and the one it misses is the one that governs the guards — non-blocking

*TECH.md Context and §5.3.*

TECH.md cites `eslint.config.js:556-569` as *the* ban and says it *"is replaced by a narrower rule"*. There is a **second, later** block at `/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/eslint.config.js:572-593` with `files: ['src/features/*/**/*.{ts,tsx}']` carrying the identical `importNames: ['redirect', 'redirectDocument']` ban and the same "invariant 97" message. In flat config the later block wins for feature files — and `src/features/auth/guard/**` is a feature file. Narrowing only 556-569 leaves the guards failing lint.

(Note also: `replace` is not on either ban list, so if the guards use only `replace` as §5.3 specifies, the only real obligation is fixing the stale "invariant 97" message text in **both** blocks.)

Resolution: name both blocks in the narrowing.

---

### 11. Invariant 41's spinner and pressed-violet control have no mechanism, and the third kit finding invariant 141 requires was not raised — non-blocking

*PRODUCT.md invariants 30, 41, 115, 141; TECH.md §7, Risks, test map "141".*

Invariant 41: *"the control is **pressed-violet with a spinner** and reads 'Signing in…'"*. Mockup 1c confirms a spinner glyph inside the button.

`/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/src/shared/ui/Button.tsx:41-52` renders `{children}` and nothing else — no spinner — and `VARIANT_CLASS.primary` is `bg-primary text-on-primary hover:bg-primary-pressed`, so a non-hovered busy button paints `--color-primary`, not `--color-primary-pressed`. There is no `Spinner` in the kit (`/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/src/shared/ui/index.ts` exports Button, Field, Input, Card, Avatar, Skeleton, ErrorState, EmptyState, FieldContext, deriveInitials, SkeletonSize, sizeClass).

TECH.md's map for invariant 141 says *"review, with **the two findings this spec raises** named explicitly (the `Input` props and the `redact` rule)"*. A busy-state spinner and a pressed appearance are a third change the kit cannot express, and invariant 141 requires it be raised rather than slipped in. Invariant 30's and 115's checks both presuppose a spinner element that no module is specified to produce.

Resolution: raise the Button change (or an inline feature-owned spinner) explicitly as the third kit/design finding.

---

### 12. Invariants 76 and 125's "any substring" is unsatisfiable as written, and the proposed checks silently test something weaker — non-blocking

*PRODUCT.md invariants 76 and 125; TECH.md test map "71, 129, 131", "72, 76", "125".*

Invariant 125: *"...does not contain the email, the password, the derived secret, **or any substring of them**"*. Invariant 76: *"The stored bytes contain **no substring** of the email, the password or the secret."*

Read literally these are false for any non-empty credential: a single character of the password is a substring of it, and a 32-hex correlation id will contain substrings of a 64-hex secret. No implementation can pass. TECH's checks quietly test the containment in the other direction (*"`JSON.stringify(buffer)` contains no substring of the typed email"* — same reversed phrasing; the intended assertion is `not.toContain(email)`).

The gap that matters: the invariant's genuine intent — catching **partial** leakage, e.g. a truncated secret prefix in a log line — is not covered by the whole-value check, and nothing says so. Invariants 76/125 are not in the review-dependent list.

Resolution: state the assertion as "does not contain the whole value" and, separately, name any prefix/partial check that is actually run.

---

### 13. Invariant 86's "not even for a frame" is not decided by the check proposed for it, and 86 is absent from the honesty list — non-blocking

*PRODUCT.md invariant 86; TECH.md test map "84, 85, 86" and "Invariants that are review-dependent".*

Invariant 86: *"There is no flash of authenticated content. The guarded route's content is never painted, **not even for a frame**, for a visitor without a session."*

The proposed check: *"assert the hierarchy heading was never present (a `page.on('domcontentloaded')` snapshot plus an immediate `expect(...).toHaveCount(0)`)."* A `domcontentloaded` snapshot and a post-hoc locator count cannot decide "never painted for one frame" — both sample discrete moments after the fact, and a one-frame paint between them is invisible to both. The structural argument in §5.3 (react-router does not render until loaders settle, plus `HydrateFallback: () => null`) is the actual guarantee, and it is a review claim.

Invariant 86 appears in neither the "fully" nor the "partially" review-dependent list, so the list is not complete in the way the section claims.

Resolution: move 86 to the partially-review-dependent list with the structural argument named as the covered half.

---

### 14. The header is a data surface with no error and no empty state, deviating from ARCHITECTURE.md without a decision-log entry — non-blocking

*PRODUCT.md invariants 97c, 99; ARCHITECTURE.md §4 "Validation and error taxonomy"; PRODUCT.md "Open questions".*

ARCHITECTURE.md line 96: *"The UI has four states everywhere data is involved: skeleton, error with a retry that re-runs the loader, empty, and data."* Invariant 97c forbids an error state for the header's fetch outright (*"never surfaces an error page ... Neither presentation is an error state and neither carries an alert"*), and invariant 99 gives it only skeleton / data / neutral.

Invariant 29 handles the login page's exemption explicitly (*"It loads no data to render itself, so the 'four states' rule does not produce those two here"*). The header **does** load data, so the same reasoning does not apply. The two knowing ARCHITECTURE deviations are recorded (open questions 3 and 4); this third one is neither recorded nor argued.

Resolution: add a decision-log entry for the header's three-state presentation, or state in invariant 99 why the four-states rule does not bind a decorative name.

---

### 15. The failed-name avatar is specified as a permanently animating loading skeleton — non-blocking

*PRODUCT.md invariant 99; TECH.md §6 "The three presentations".*

Invariant 99: if resolution fails, *"the avatar shows its **placeholder shape** rather than derived initials ... Neither presentation is an error state."* TECH.md: *"`Avatar` with `displayName` when resolved, and a `Skeleton shape="circle"` sized `SkeletonSize.avatar` **in the other two cases**."*

`/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/src/shared/ui/Skeleton.tsx:39` hard-codes `animate-pulse`. Using it for the terminal failed state renders a permanently pulsing circle that says "still loading" forever, and `aria-hidden="true"` (line 38) removes it entirely from the accessibility tree in a settled state. The invariant asks for a *placeholder shape*, not a loading indicator.

Resolution: specify a distinct static placeholder for the failed case, or say explicitly that the skeleton is reused and drop `animate-pulse` from that instance.

---

### 16. Component tests of the success path have no router, and the change TECH specifies to `renderRoute` does not add one — non-blocking

*TECH.md §5.1, §9; test map "65", "66", "130".*

`/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/src/app/testing/renderRoute.tsx:73-81` renders `<ApplicationRoot runtime={runtime}>{children}</ApplicationRoot>` — no `RouterProvider`, no `MemoryRouter`. TECH.md's only stated change is *"it gains a fake `tabStorage` and a store built over its fake transport"*.

But the success path calls `navigate(destination, { replace: true })` (§5.3), and several checks are specified as **component** tests that reach it: *"65 - component: a retry that succeeds clears the alert **and navigates**"*, *"130 - component: submitting produces no navigation event ... asserted by a `beforeunload`/`popstate` spy"*. Outside a router, `useNavigate` throws.

Resolution: state whether navigation is injected as a `LoginPageDependencies` function (testable without a router) or whether `renderRoute` gains a router.

---

### 17. M3 and M4 overlap: the authenticated layout and the user store are split across the boundary that claims to be sequential — non-blocking

*TECH.md "Milestone split", M3 and M4; §5.1, §5.2.*

M3 delivers *"the pathless authenticated layout route **and its lazy loader**"*; M4 delivers *"`AuthenticatedLayout`, `SignedInHeader`, ... `createSignedInUserStore`"*. But §5.2 says *"`authenticatedLoader` is supplied by the lazy module together with `AuthenticatedLayout`"* and §6 says *"`authenticatedLoader` calls `store.read(userId)` and returns the promise"*. M3's loader therefore references a component and a store M4 delivers, while §5.1 says `createRuntime` gains **both** `tabStorage` **and** `signedInUserStore` in one change and M3's list names only `tabStorage`.

Resolution: put the `AuthenticatedLayout` shell and `signedInUserStore` wiring wholly in M3, with M4 adding only the header's contents.

---

### 18. No catalogue key exists for the correlation-id label the service-problem alert renders — non-blocking

*PRODUCT.md invariants 58, 63, 116; TECH.md §8.*

Invariant 58 requires the service-problem alert to carry *"the correlation id for the attempt"*, and invariant 116 requires **every** user-visible string added by this phase to come from a catalogue (*"A hardcoded literal fails lint"* — `i18next/no-literal-string` at `eslint.config.js:196-220`).

TECH.md's enumerated `auth.json` keys are: `documentTitle, heading, subtext, emailLabel, emailPlaceholder, passwordLabel, footerNote, footerNoteSubmitting, submit, submitting, noMatchMessage, serviceProblemMessage, retry, wordmark`. A bare 32-hex string on screen with no label is unusable ("an identifier I can quote when I report it" — user story), and any label an implementer adds will need a key that is not in the list. `vitest.setup.ts`'s empty-`missingKeyReports` assertion means the omission surfaces as a test failure, not a design conversation.

Resolution: add a `serviceProblemCorrelationLabel` (or interpolate the id into `serviceProblemMessage`) to the enumerated key list.

---

### 19. Invariant 22's proposed component check ("an empty spy sink") is contradicted by the http client's own cancellation path — non-blocking

*PRODUCT.md invariants 22, 124; TECH.md test map "22".*

The check: *"the component test unmounts mid-flight and asserts no act warning, no state update and **an empty spy sink**."*

A caller-aborted request emits two records before returning `cancelled` (`/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/src/platform/http/createHttpClient.ts:104-118`): `observability.logger.debug('http.request_cancelled', ...)` and `observability.tracer.recordTiming({ ..., outcome: 'cancelled' })`. Both reach `dispatch` and therefore the sink. The sink is not empty; it holds exactly these two, which is correct behaviour under invariants 22 and 124 ("no error-level log", "no failure telemetry event").

Resolution: restate the check as "no error-level record and no `auth.sign_in_settled`", matching what the invariants actually forbid.

---

## What was checked

I read both specs end to end, then verified TECH.md's citations against the code rather than accepting them: `src/app/routing/routeDefinitions.ts`, `createApplicationRouter.ts`, `createInteractionTracker.ts`, `src/app/bootstrap.ts`, `src/app/composition/createRuntime.ts` and `useRuntime.ts`, `src/app/testing/renderRoute.tsx`, the whole of `src/platform/http/{createHttpClient,performAttempt}.ts`, `src/platform/observability/{redact,createObservability,analyticsEvents}.ts`, `src/shared/ui/{Input,Field,Button,Avatar,Skeleton,index,sizeClass,skeletonSize}`, `src/shared/theme/{theme.css,contrastPairs.ts}`, `src/shared/utils/bytesToHex.ts`, `src/shared/testing/createFakeTransport.ts`, `src/features/auth/{index,AuthPlaceholderPage,loadTranslations,locales/en/auth.json}`, `eslint.config.js` (lines 25-144, 190-380, 540-700), `scripts/assert-domain-vocabulary.mjs` in full, `scripts/eslint-configuration.test.ts:40-98`, `vitest.config.ts`, `vitest.live.config.ts`, `scripts/live-smoke/live-smoke.test.ts`, `build-output/catalogue-chunks.test.ts`, all seven e2e specs plus `e2e/support/routeMocks.ts`, and `docs/task.md` (I counted the 256 table entries by hand — the literal is exactly 256 and every value is in 0-255). I verified the React Router claims directly against the installed 8.x sources (`lib/router/utils.js:774-778`, `lib/router/router.js:981-1042`, `:2604-2605`, `:2762-2767`, `utils.d.ts:433-505`) rather than trusting the spec's quotes. Attacks I ran that the specs survived: `resolveDestination` against `//evil.example`, `/\evil.example`, `/\t/evil.example`, `/%2f%2fevil.example`, `/..//evil.example`, `https:/evil.example` and `from=/login?from=/login` (the three-clause test, and specifically the resolved-origin clause, catches every escape and the loop); the invariant-by-invariant test map (all 146 invariants have an entry — none is silently unmapped); the Zod lookup union against `{}`, `[]`, `''`, `true`, `1.5`, `Infinity` and `null` (it discriminates correctly and `parse`-throw→`{kind:'parse'}`→failure is the real mapping at `performAttempt.ts:57-63`); the redaction path-segment rule against all three sinks named (`createHttpClient.ts:65-67`, `:105-108`, `:142-151` — the rule does reach each of them, and TECH's diagnosis that the existing `redact` leaks the secret verbatim is correct); and the domain-vocabulary scanner against the proposed identifiers `SUBSTITUTION_TABLE`, `normalizeToCodeUnits`, `SignInOutcome`, `KeyValueStorage` and `createTabStorage` (none trips a ban).
