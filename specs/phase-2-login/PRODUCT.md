# Product spec: phase-2-login - signing in, staying in, and signing out

## Summary

Phase 2 turns the placeholder `/login` route into the real sign-in surface: the user types an email address and a password, the app derives a secret from them client-side, looks that secret up against the database, and either lands the user on the hierarchy page or tells them plainly that no user matches. A session that survives a reload and dies with the tab is written on success, a guard runs before any data fetch so an unauthenticated visitor never triggers one, and - scope widened during framing - the authenticated view carries a header with the signed-in user's name and a logout affordance, after which the back button cannot return to an authenticated view.

## User stories

**As a user who has an account in this directory**, I open the app and get a login card. I type my email and my password, press Login, watch the button tell me it is working, and arrive at the hierarchy page. If I mistyped something, I get one clear sentence saying no user matches that email and password - not a spinner that quietly stops, not a blank page, and not a guess about which of the two fields was wrong. My typing is still there so I can correct it rather than retype both fields. If the problem is the service rather than my credentials, I am told that instead, given a way to try again, and given an identifier I can quote when I report it.

**As a user who bookmarked a page inside the app**, I open my bookmark, get sent to the login card because I am not signed in, and - once I sign in - land on the page I bookmarked rather than on the app's front door. I never see a flash of the page I was not allowed to see, and the app never fetches its data before deciding I may have it.

**As a user who is already signed in**, a reload keeps me signed in in this tab. Typing `/login` into the address bar does not show me a form I do not need; it puts me back where I was going. When I am done, the header shows who I am signed in as and a logout affordance right there; pressing it returns me to the login card, and pressing the browser's back button afterwards does not put me back inside the app.

**As a keyboard or screen-reader user**, I reach every operable control in the card by tabbing in the order it reads, I hear each field's visible label as its name, and I hear that both fields are required - which is what tells me why the Login control is not yet in my tab order, since a disabled control announces nothing (invariants 35-37). When the attempt fails, I hear the message without having to go hunting for it, and my focus does not jump somewhere I did not ask it to go.

**As the person reviewing this phase**, I can see, from a network log rather than from prose, that authenticating issued exactly one request and that it was not the users table - and that the one user record the header fetches afterwards is the only other request the whole flow makes. I can see, from a storage dump and from the telemetry buffer, that no email, password or derived secret is anywhere in either. I can see the five states of the card in a browser, failure paths included.

**As the developer building phase 3**, I inherit a session I can read, a guard I can put in front of a route, and a header that already exists. The tree is the only thing left to build.

## Behavior (numbered invariants)

Every invariant is observable: a unit test on the pure derivation, a component test, a Playwright flow, a storage or network assertion, or a reviewer with the deployed URL can decide it. Where an invariant names a colour or a piece of copy, it names the mockup's value and the value's meaning, not the mechanism that produces it.

### The credential derivation

1. The derivation takes an email string and a password string and returns a 64-character string drawn only from `0-9` and `A-F`. Every other output shape is a defect, including lowercase hex, a shorter or longer string, and any string carrying a separator.
2. The derivation is pure: same two inputs, same output, every time, in every environment. It performs no I/O, reads no clock, consumes no randomness, touches no storage and is synchronous.
3. Both inputs are normalised to exactly 32 UTF-16 code units before use, by repeating the input end to end until it is at least 32 units long and then keeping the first 32. A 3-character password contributes its characters cyclically; a 90-character email contributes only its first 32 units.
4. Each of the 32 positions produces one output byte: the two normalised inputs' code-unit values at that position are combined by exclusive-or, the result is reduced to the range 0-255, and that number indexes a fixed 256-entry lookup table. The table entry is rendered as two uppercase hex digits, zero-padded, and the 32 pairs are concatenated in position order. The output is always 64 characters even when a normalised input is shorter than 32 entries, because a missing entry participates in the exclusive-or as `undefined` and `undefined ^ x` evaluates to `x` - see invariant 7, which is where the short case comes from and why it is preserved rather than corrected.
5. The lookup table has exactly 256 entries, each an integer in 0-255, and its contents are byte-for-byte the literal recovered from the brief. A table that is structurally valid but numerically wrong produces plausible garbage and fails silently, so the table's identity is asserted against a recorded fixed value, not merely against its length and range.
6. The derivation is proven against at least one real account: the secret it produces for that account's real email and password resolves, against the live database, to that account's user id. Shape-only unit tests do not satisfy this invariant.

    6a. No credential is committed to the repository to satisfy invariant 6. The proof reads an account's email and password out of the public users payload at run time, derives the secret from them, and asserts that the secrets lookup returns that same account's id - so the account is whichever the database serves, the assertion is repeatable as the data changes, and nothing credential-shaped is written down. The proof runs only in the explicitly invoked live suite, never in the gating one, because it depends on a backend the gating suite is not allowed to need.
7. The brief's algorithm is transcribed byte-exact, including the part of it that is a Unicode defect, and this invariant states the defect rather than the behaviour a corrected version would have. Two consequences follow from the brief's `return Array.from(resultString, (char) => char.charCodeAt(0))` (`docs/task.md:44`), and both are preserved:

    - **Iteration is by code point, not by code unit.** A non-BMP character survives truncation as *one* element whose `charCodeAt(0)` is its **high surrogate only**; the low surrogate is discarded. It does **not** contribute both of its surrogate code units.
    - **The normalised array is therefore shorter than 32 whenever an astral character survives the 32-code-unit truncation.** The derivation still reads all 32 positions, so the tail positions read `undefined`. `undefined ^ x` evaluates to `x` (because `ToInt32(NaN)` is `0`), which means those positions are driven by the other input alone. The output is still 64 hex characters; it is simply not the output a code-unit-faithful implementation would produce.

    A code unit at or below 0xFFFF but above 255 still contributes its low byte through invariant 4's `& 0xff` reduction, which is the ordinary Latin-1-overflow case and is not affected by the above.

    This is a knowing decision, not an oversight: fidelity to whatever secrets the real database was actually built with outranks defensible Unicode handling, because a "corrected" derivation would compute a different secret for any account whose credential contains an astral character and would lock its owner out. The decision is recorded against ARCHITECTURE.md's decision log (see "Deviations that need a decision-log entry"). The test for this invariant asserts the brief's actual bytes - recomputed from the brief's own source in the test - and is named so that a later reader recognises the strangeness as intended.
8. The derivation is not injective, and nothing tries to make it so. A password and that password repeated (`ab` and `abab`) normalise identically and therefore produce the same secret, as do any two inputs agreeing on their first 32 normalised units. A user signing in with such a variant is expected behaviour, not a defect, and the app makes no attempt to detect or prevent it.
9. The email is trimmed of leading and trailing whitespace **before** it is handed to the ported algorithm, and nothing else about it is normalised. It is not lowercased, not Unicode-normalised, and its internal whitespace and punctuation are preserved exactly, because the derivation depends on the exact code units and a stored address containing an uppercase letter would stop matching.

    This trim is a **knowing deviation from the brief**, which passes `email` to `make32` untouched (`docs/task.md:47-49`). It is kept because a trailing space picked up from a paste or an autofill is overwhelmingly more likely than a stored address whose own value has boundary whitespace, and the failure it prevents (a valid credential silently producing a wrong secret) is invisible to the user. The cost, stated rather than hidden: an account whose stored address genuinely begins or ends with whitespace cannot be signed into by this app. The trim happens strictly **outside** the ported algorithm - it is a pre-processing step on the input, not an edit to the transcription - so invariant 7's byte-exactness claim is about the algorithm and this invariant is about what is fed to it. Recorded against ARCHITECTURE.md's decision log (see "Deviations that need a decision-log entry").
10. The password is used exactly as typed. No trimming, no case change, no normalisation of any kind. A password that is a single space is a legitimate password.
11. The derivation is never invoked with an empty string on either side. Repeating an empty string can never reach 32 units, so an empty input has no defined result; the derivation rejects it immediately rather than looping, and the form's submit gate (invariant 34) means the rejection is unreachable in normal use.
12. The trimmed email and the password live in exactly two places: the two form fields, and the login page's own component state for as long as that page is mounted. Nothing else receives either value. They reach no storage, no URL, no history entry, no log, no telemetry payload, no trace attribute, no error object, and no DOM text node; the derived secret leaves the page only inside the one lookup request URL invariant 132 names. When the login page unmounts, both are gone with it.

    This is the honest boundary rather than a stronger-sounding one. Controlled inputs are required by invariants 42, 53 and 62 - the values must survive every state transition byte-identically - and a controlled input necessarily holds its value in component state. An invariant saying the password "exists only as the field's value" would be false the moment the first character is typed, and no test could prove it. What a test *can* prove is the list above, and that is what invariants 125, 129 and 131 assert.

### The secret lookup

13. A submission issues exactly one logical request: a GET for the secrets entry named by the derived secret. No other request is made as part of authenticating.
14. Nothing on the users path is requested **while authenticating** - not the whole database, not the users collection, not a single user record. The window this invariant bounds opens when the submission starts and closes when the lookup settles: from the first keystroke through to the moment a user id is in hand, the network log contains the secrets request and nothing else from this application's origin. This is the invariant that keeps the plaintext password table out of the client at login, and it is asserted from the network log rather than argued.

    What happens **after** that window is invariant 97's business: once a session exists, the header fetches one user record by id (`/users/<id>.json`). That request is outside this invariant's window by construction, it decides nothing about access, and it is a single record rather than the collection. The collection - the thing that carries every plaintext password - is never fetched by this phase at all, in or out of the window. Invariant 97d holds that line for phase 3.
15. The request carries no query string derived from user input, no request body, and no custom header carrying credential material.
16. A response whose parsed body is `null` means no user matches. This is a normal outcome, not a failure: it produces the no-match state (invariants 50-57), is not retried, and is not reported as an application error.
17. A response whose parsed body is a valid user id signs the user in (invariants 66-71).
18. A response that is neither `null` nor a valid user id - an object, an array, an empty string, a boolean - is treated as a service problem (invariants 58-65), never as a no-match, because a malformed response is not evidence that the credential is wrong.

    18a. A valid user id is either a non-empty string drawn only from `A-Z`, `a-z`, `0-9`, hyphen and underscore, or a finite integer; both are accepted and carried forward as the same identifier. `docs/reference.md` records the secrets map as "secret to user id" without settling which one the backend serves, and phase 1's live smoke printed the users record's field names only; accepting both removes the guess rather than betting on it. A boolean, a fractional or non-finite number, an empty string, an object, an array, and **a string carrying any character outside that charset** are not user ids and fall to invariant 18.

    The charset restriction is a security boundary, not fastidiousness. The id is interpolated into a request path (`/users/<id>.json`, invariant 97) and into a stored session record, so an id of `../secrets` would resolve `/users/../secrets.json` to `/secrets.json`, and `/`, `?`, `#` and a backslash would each address a different resource than the one intended. The restriction is applied at the parse boundary, before the id is used for anything or written anywhere, so a hostile or corrupt value never becomes an identifier in the first place; a response carrying one is a malformed response and produces the service-problem state. Belt and braces: the id is also percent-encoded where it is placed into the path, so the encoding does not depend on the charset check having been right.

    A stored session record whose user id fails the same check is unreadable in the sense of invariant 77 - removed, treated as no session, reported at warning level.
19. A network failure, a timeout, or any HTTP error status produces the service-problem state, never the no-match state. The two are distinguishable in the UI, in telemetry, and in a test.
20. The lookup inherits the HTTP client's existing behaviour unchanged, and this invariant describes that behaviour as the client actually implements it rather than as its retry predicate reads: one deadline covering the whole call; at most one retry; a retry on a network failure or a 5xx; never on a 4xx and never on a parse failure. A **deadline abort is not retried** - `createHttpClient.ts:121-133` returns `{ kind: 'timeout' }` from the aborted branch before `shouldRetry` is consulted, so `shouldRetry`'s `timeout` member is unreachable from this call path and a timeout produces exactly one transport call. Nothing about login special-cases any of it, and nothing about login changes the client to make the predicate reachable - that would be a change to a module invariant 141 freezes.
21. The lookup has no side effects, so its retry is safe and a duplicate request changes nothing.
22. An aborted lookup - because the user navigated away or reloaded - is not a failure. It produces no error state, no error-level log and no failure telemetry event.

### The login page and its fidelity to the mockups

23. The login route stays at `/login` and renders a single centred card on the violet-tinted login canvas, on every one of the states below.
24. The card carries, in this order top to bottom: the product mark (a small violet logo tile with the wordmark "Hierarchy"), the heading "Please login", the subtext "Use the email address on your user record.", the labelled email field, the labelled password field, the full-width Login control, and a footer note. The alert of invariants 50 and 58, when present, sits between the heading block and the email field. Its position in the DOM is that same position - the card is not reordered visually against its markup - which is what makes reading order, visual order and tab order one order (invariant 105) rather than three that have to be reconciled.
25. The heading is the page's only `h1` and the page sits inside the existing main landmark with the existing skip link.
26. The document title for this route comes from the catalogue and identifies the page as the sign-in page.
27. The card holds a fixed maximum width matching the mockup and remains readable from a 320px viewport upward with no horizontal overflow, in every state.
28. The dark theme is derived over the same token names as the light theme, holds WCAG AA in both, and no state of this page introduces a raw colour value. The mockups are light-only; dark is not a second design.
29. The login page has no skeleton state and no empty state. It loads no data to render itself, so the "four states" rule does not produce those two here; this page's states are idle, ready, submitting, no-match and service-problem.
30. Under `prefers-reduced-motion: reduce`, the submitting state's spinner does not animate and no transition between states animates. The states remain distinguishable without motion.

### Idle and ready

31. On first render, both fields are empty, no alert is present, the footer note reads "Trouble signing in? Contact your workspace admin.", and the Login control is inert and rendered in the muted violet of mockup 1a.
32. As soon as the trimmed email is non-empty **and** the password is non-empty, the Login control becomes active and is rendered in full violet, matching mockup 1b. Emptying either field returns it to inert immediately.
33. "Non-empty" is evaluated on the trimmed email and on the password exactly as typed. A whitespace-only email leaves the control inert; a password consisting of whitespace does not.
34. The inert control cannot start a submission by any route: pointer activation, Enter or Space on the control, and Enter pressed inside either field all produce no derivation and no request.
35. The inert control is disabled outright, in the sense the platform gives that word: it is removed from the tab order, it does not receive focus, and activating it produces no event. This is the user's explicit decision, taken over a focusable-but-inert alternative, and it is recorded here as a decision rather than as an oversight.
36. The accepted consequence of invariant 35 is that a keyboard user tabs from the password field past the control, and a screen-reader user is given no spoken explanation of why the control is unavailable. What carries the explanation instead is invariant 37's required marking on both fields plus the subtext under the heading; the control itself says nothing. This is the known accessibility cost of the chosen design and is stated so that a reviewer reads it as a trade-off already weighed, not as a defect to file.
37. Both fields are marked required, so each announces its required state when focused. With the control silent by invariant 35, this is the only programmatic signal that something is still needed.
38. The email field accepts any text and is never rejected on format grounds. The app performs no address-shape validation, in the browser or in code: the only authority on whether a credential is valid is the lookup, and rejecting an unusual-but-stored address locally would lock its owner out of an account that works.
39. The password field masks its value, and there is no reveal control. Nothing in any state renders the password's characters as text.
40. Both fields expose the credential-field semantics a password manager needs, so autofilling both fields produces the same enabled state as typing them. Whether a browser then offers to save the credential is the browser's decision and is outside this app's behaviour.

### Submitting

41. Activating the active Login control moves the card to the submitting state, matching mockup 1c: both fields render on the grey surface and are non-editable, the control is pressed-violet with a spinner and reads "Signing in…", and the footer note is replaced by "Looking up your user record.".
42. The field values remain visible and remain in the accessibility tree while non-editable; they are not cleared, blanked or replaced with placeholders.
43. Exactly one lookup is in flight per submission. A second activation while submitting - by pointer, by Enter on the control, or by Enter inside a field - produces no second derivation and no second request.
44. The control keeps its accessible name while busy, it remains focusable, and it is announced as busy. The transition into and out of this state **moves focus nowhere**: whatever held focus when the submission started still holds it afterwards. That is deliberately stated as "does not move" rather than "stays on the Login control", because invariant 107 makes Enter inside either field a submission path, so the focused element at submit time is often a field. Focus is never dropped to the document body by either transition.

    The one exception is a submission started from the retry control, where invariant 60 governs instead: that transition unmounts the element holding focus, so it must move focus rather than leave it, and invariant 110 records the same carve-out. A test written from this invariant covers the pointer and Enter-in-field start paths; the retry start path is invariant 60's.
45. Any alert present from a previous attempt is removed when a new submission starts, so the user never sees a stale failure alongside an in-flight attempt.
46. The submitting state persists for as long as the lookup takes, up to the HTTP client's deadline. There is no separate login-specific timer and no minimum display time.
47. Navigating away during a submission cancels it: the lookup is aborted, no state update lands on the unmounted page, and no error surfaces anywhere.
48. Reloading the document during a submission cancels it and returns the page to the idle state with both fields empty. Nothing about an in-flight attempt survives a reload.

    48a. Back and Forward across the login page behave the same way, including when the browser restores the page from its back-forward cache rather than re-executing it. Navigating Back out of a submission cancels it exactly as invariant 47 describes. Arriving on the login page by Back or Forward - restored or re-executed - never shows an in-flight indicator for a request that is no longer in flight: any controller still held is aborted and the card settles on one of its five states, with no spinner, no "Signing in…" label and no busy control. A restored card may still carry the field values and the alert the visitor left on it, because that is component state the browser preserved and there is no reason to throw the visitor's typing away; what it may not carry is a submitting state with nothing behind it. A restored **authenticated** view is invariant 103's business, not this one's.

49. The URL does not change **while an attempt is in flight, nor on either failure outcome**. It stays `/login`, with whatever `from` parameter it already carried, from the moment the submission starts through no-match, through service-problem, and through any number of retries. A successful attempt is the one exception and it is the whole point of invariants 66-70: success navigates away from `/login`, replacing its history entry. So the URL changes exactly once, at exactly one moment - when the user is signed in - and never as a side effect of submitting, failing or retrying.

### No match

50. A `null` lookup result moves the card to the no-match state, matching mockup 1d in every respect except the deliberate deviation of invariant 52: an alert block sits between the heading and the email field, on the pale danger background, with a round danger badge and the message "No user matches that email and password. Check both and try again." in danger ink.
51. Both fields carry the danger border and are marked invalid to assistive technology, and both are described by the alert's message.
52. There is **no** field-level message under either field. Mockup 1d's "Incorrect password" line is deliberately not built: the derivation collapses the email and the password into one secret, and a `null` lookup cannot attribute the failure to either field. Rendering an attribution the app cannot support would send a user to change a password that was already right. This deviation is recorded against the mockup rather than silently applied.
53. Both field values are preserved exactly, including the password, so the user corrects rather than retypes.
54. The Login control returns to its active, full-violet state, because both fields are still non-empty.
55. The alert is announced to assistive technology when it appears, and **its appearance moves focus nowhere**: whatever held focus when the response arrived still holds it. That is the Login control when the user activated it, and the email or password field when the user submitted with Enter from inside one (invariant 107) - the invariant is about the transition, not about a particular element.
56. The alert and the invalid marking persist while the user edits the fields, and clear when the next submission starts. They do not vanish on the first keystroke: the message is the explanation the user is acting on, and removing it mid-correction removes the reason.
57. Emptying a field while the alert is showing returns the Login control to inert without dismissing the alert. The two conditions are independent.

### The service could not answer

58. A network failure, a timeout, an HTTP error status, or an unparseable or wrongly shaped response moves the card to a fifth state that is visually and textually distinct from no-match: its own alert, whose message says the sign-in service could not be reached and that the attempt can be retried, plus the correlation id for the attempt. This state is beyond the mockups' four and is specified here rather than inferred from them.
59. This state carries a retry affordance that is a real, focusable, keyboard-operable control with an accessible name, distinct from the Login control.
60. Retrying re-derives from the current field values and issues a new lookup, moving the card back to the submitting state. The credentials are not cached from the failed attempt: if the user edited a field before retrying, the edited values are used.

    Retrying also destroys the control the user just pressed - the retry affordance lives inside the alert, and invariant 45 removes the alert the instant a new attempt starts - so focus is **moved deliberately, as part of the same transition, to the Login control** in its busy state. The Login control is busy rather than disabled (invariant 44), so it is a legitimate focus target, it is the control that now represents the work in progress, and it is where focus would already be had the user submitted from the card rather than from the alert. This is the one place on this page where a state transition moves focus on purpose; invariants 44, 55, 64 and 110 are written so that it is the named exception rather than a contradiction.
61. Neither field is marked invalid in this state, and neither carries a danger border. The app has no evidence the credential is wrong.
62. Both field values are preserved exactly, including the password.
63. The correlation id shown is the one attached to the failed request's telemetry record and to the error log entry for it, so a screenshot ties to a log line. It contains no credential material.
64. This state is announced when it appears and does not move focus.
65. A subsequent successful retry clears this state entirely and proceeds exactly as a first-attempt success does. A subsequent `null` result replaces it with the no-match state; the two alerts are never shown together.

### Success and navigation

66. A lookup that returns a valid user id writes the session (invariants 72-76) and then navigates away from `/login`. The session is readable before the destination route's guard runs, so a successful sign-in can never bounce back to the login page.
67. The destination is the `from` target when the current URL carries a usable one, and the hierarchy route otherwise.
68. A `from` value is usable only when it is a same-origin path: it begins with a single `/`, is not protocol-relative, and carries no scheme or authority. Anything else is ignored and the hierarchy route is used, so a crafted link cannot turn this form into an open redirect.
69. A usable `from` pointing at a path the app does not serve lands on the not-found route after sign-in. It is not rewritten to the hierarchy route and it is not treated as an unusable value.
70. The login page's history entry is replaced rather than added to on a successful sign-in, so pressing Back from the destination does not return to a filled-in login card.
71. Nothing about the submission - not the email, not the password, not the secret, not the resolved user id - appears in the destination URL, in a query parameter, in a hash, or in a history entry's state.

### The session

72. A session record holds a user id and a schema version, and nothing else. No email, no display name, no password, no secret, no token, no timestamp derived from a credential.
73. The record lives in tab-scoped session storage. It survives a reload of the tab and is gone when the tab closes. A new tab opened independently starts signed out.
74. A tab duplicated from a signed-in tab may inherit a copy of the record, because that is how tab-scoped storage behaves. The duplicate is treated as a valid session; this is browser behaviour, not a defect, and is stated so a reviewer does not read it as one.
75. Nothing else is written to any storage by this phase. Local storage, IndexedDB and the service-worker cache stay empty; the tab-scoped session record is the single exception to phase 1's blanket storage prohibition, and it is narrowed to that one record rather than opened generally.
76. Signing in and then dumping storage yields exactly one entry, whose entire content is a user id and a schema version. The stored bytes contain **neither the email, the password nor the secret in full, and no run of twelve or more consecutive characters of any of them**. This is asserted, not eyeballed.

    The two-part wording is deliberate. "No substring at all" is unsatisfiable and would make the invariant untestable rather than strict: a one-character password is a substring of almost any JSON, and a schema version of `1` collides with a password of `1`. The whole-value half catches a verbatim leak; the twelve-character-window half catches the leak that actually worries us - a truncated prefix of a 64-character secret, or a password fragment - and twelve is chosen because the test drives high-entropy credentials, so twelve characters colliding by accident is not a thing that happens while twelve characters leaking is. What neither half catches is a fragment shorter than twelve characters, which is stated in the review-dependent list rather than pretended away.
77. A stored record that cannot be parsed, is missing its user id, or carries a schema version this build does not recognise is treated as no session at all. It is removed, the visitor is treated as signed out, and the situation is reported through observability at warning level. The visitor sees the ordinary login card, never an error page and never a crash.
78. Reading the session never throws into application code, whatever the storage layer does. A browser that denies storage access, a disabled-storage configuration and a quota failure all surface as "no session" rather than as an exception.
79. When persisting a session fails, the sign-in still completes and the user still reaches the destination: the session is readable for the remainder of that page's lifetime regardless of whether it reached storage. The consequence, which is the honest one, is that a reload then signs the user out. The failure is reported through observability; the user is not shown an error for something that did not stop them.

    79a. What the page believes about the session **overrides** whatever storage happens to hold, for as long as the page lives. This matters in exactly the two cases where storage is stale rather than empty:

    - A failed write over an **older, still-valid** record. Without this rule the app would read the old record back and sign the visitor in as the previous user - a wrong-identity failure, not a degraded one. The write that failed still decides who is signed in for this page.
    - A failed removal on sign-out. Without this rule the just-signed-out visitor is redirected straight back inside on the next guard run. Signing out ends the session for this page whether or not the record could be deleted.

    Storage is consulted only when the page has no belief of its own yet, which is exactly the fresh-load case invariant 80 depends on. The failure is reported at warning level in both directions, and both cases keep invariant 79's honest consequence: after a reload, whatever storage actually holds is what the visitor gets.
80. A reload of an authenticated view keeps the user signed in and re-renders the same route. It does not bounce through the login page.
81. The session is never used to decide *what* the hierarchy shows. Phase 3's tree is the whole organisation regardless of who is signed in; the session decides only whether the page may be seen at all.
82. Nothing expires the session on a timer. It ends when the tab ends, when the user signs out, or when its record becomes unreadable.
83. Signing out in one tab does not affect another tab, because the storage is tab-scoped. This is intended and is stated rather than left to be discovered.

### The route guard

84. A request for an authenticated route without a session redirects to the login route, carrying the requested **path and search** as the `from` value, before the destination route renders anything. The **fragment is not carried**, and that is a stated limitation rather than an omission: React Router strips the hash from a loader's `request.url` before the loader ever sees it (`createClientSideRequest` builds the URL through `stripHashFromPath`, `react-router/dist/development/lib/router/router.js:2604-2605, 2762-2767`), so a guard reading `request.url` cannot recover it. A visitor who bookmarks `/#team-3` therefore returns to `/` after signing in, not to the fragment. Reading `window.location.hash` in the guard was considered and rejected: it is the *previous* page's hash during a client-side push navigation, which would carry the wrong fragment forward - worse than carrying none.
85. The redirect happens before any data fetch for the destination route is started. An unauthenticated request for the hierarchy route issues no users request at all - assertable from the network log.
86. There is no flash of authenticated content. The guarded route's content is never painted, not even for a frame, for a visitor without a session.
87. Back from the login card returns the visitor to wherever they actually came from, and never ping-pongs through the guarded URL. The guarded URL never gets a history entry of its own, in either of the two ways a visitor can reach it:

    - **The guarded URL is already the current history entry** - a typed URL, a bookmark, a reload, or a Back/Forward onto it. The redirect must *replace* that entry, or the entry stays behind and Back from the login card walks straight into the guard again.
    - **The guarded URL is the target of an in-app navigation** - a link click or a programmatic push from some page A. Here the redirect must *push*, because React Router does not touch history until the navigation's redirects have been processed, so the pending entry for the guarded URL does not exist yet and the login card takes its place. Forcing a replace in this case overwrites **page A's** entry instead, and Back then lands on whatever preceded A - the direct negation of this invariant.

    One unconditional choice cannot satisfy both, so the guard chooses per navigation. `e2e/not-found.spec.ts` already performs the second kind (its home link pushes to `/`), so both are exercised rather than hypothetical.
88. A request for the login route **with** a session redirects to the `from` target when the URL carries a usable one and to the hierarchy route otherwise, before the form renders. The form is never painted for a signed-in visitor.
89. Invariant 88's redirect applies to every route into the login page: a typed URL, a bookmark, a Back navigation onto it, and the guard's own redirect if a session appears between the two.
90. The not-found route is not guarded. An unknown path renders not-found for a signed-in and a signed-out visitor alike, and does not redirect to the login page.
91. The login route is reachable by a visitor with no session with no redirect, no matter how they arrived.
92. The `from` value in the login URL is a path and, where the guarded request had one, its search string - never a fragment (invariant 84). It never carries a credential, a secret, a user id or a session marker, and a `from` value that appears to carry one is still treated as an opaque path and is subject to invariant 68.
93. No sequence of guard redirects can loop. A signed-out visitor lands on the login page and stops; a signed-in visitor lands on their destination and stops.

### The header and signing out

94. Authenticated views carry a header bar with a bottom hairline, matching mockup 1e's header: on the leading side an eyebrow reading "Directory" above the page title "Hierarchy Tree"; on the trailing side the signed-in user's full name with a violet logout affordance directly beneath it, then an avatar showing that user's initials.
95. The header does not render on the login route and does not render on the not-found route, in either session state.
96. The header's avatar shows initials derived from the displayed name and carries no photograph in this phase. Per-user photos belong to phase 3's tree rows.
97. The signed-in user's full name is obtained by requesting that one user's record, by id, **after** authentication has already succeeded. This is outside the window invariant 14 bounds - it happens only once a session exists, fetches a single record rather than the collection, and decides nothing about access - and invariant 14's own text says so from its side, so the two are one contract rather than two claims that have to be reconciled. The id is percent-encoded where it is placed into the path, on top of invariant 18a's charset restriction, so no id can address a resource other than the one record. The result is held for the lifetime of the tab's page, not persisted, so the session record stays exactly what invariant 72 says it is.

    97a. Only the fields the header renders survive the boundary: the identifying fields and the name parts. The record's `password` field is discarded where the response is parsed and never reaches application state, a component, a log, a telemetry payload or storage. That the public database serves it is not a reason for this app to carry it.

    97b. The request is made once per page lifetime per signed-in user, not once per navigation between authenticated routes and not once per render. A reload re-requests it, which is the honest consequence of not persisting it.

    97c. A failure of this request - network, timeout, HTTP error, malformed body, or a record that does not exist - never signs the user out, never redirects, never surfaces an error page, and never blocks the view beneath the header. It is reported through observability at warning level and resolves to invariant 99's unresolved-name presentation.

    97d. This request is distinct from anything phase 3 does. Phase 3 fetches the users collection for the tree; that this phase fetches one record for the header does not make the collection request this phase's business, and the two are not merged here.

    97e. The header is proven against the **real** database, not only against fixtures. Every gating check of the resolved-name presentation feeds a mocked record, so an implementation whose schema does not match the live payload's field names would pass every gate and show the neutral fallback to every real visitor - a silent failure of exactly the kind invariants 5 and 6 exist to prevent for the derivation. The live proof of invariant 6a is therefore extended: having resolved an account's real id from its real credentials, it fetches that id's record from the live database and asserts the name this app would display is a non-empty string derived from that record. It runs only in the explicitly invoked live suite, never in the gating one, and it fails with the field names it actually found rather than with a bare assertion, because `docs/reference.md:13` records that those names are unconfirmed.

98. Whatever the header shows in the name position, the logout affordance is present and fully operable, including before a name is known and if a name can never be obtained. Signing out never depends on resolving a name.
99. The name position reserves its final width and height in every case, so the header does not shift or reflow when a name arrives or fails to arrive. While the name is resolving, the position renders a name-shaped skeleton and the avatar renders a matching loading placeholder, both marked as busy to assistive technology rather than announced as content. If resolution fails, both settle into a neutral signed-in presentation drawn from the catalogue that identifies the session without naming the user, and the avatar shows a **static** placeholder shape rather than derived initials, because there is no name to derive them from.

    The resolving placeholder and the failed placeholder are **different things and must look different in the one way that matters**: the resolving one animates and says "still working", the failed one is settled and says "this is the final state". A permanently pulsing shape in a terminal state is a lie told at 60fps, and it is also invisible to assistive technology, which would leave a settled state announcing nothing at all. So the failed case does not reuse the loading skeleton; it renders a plain, unanimated shape of the same reserved box.

    Neither presentation is an error state and neither carries an alert. This is a deliberate departure from ARCHITECTURE.md's "four states everywhere data is involved": the header's fetch *is* a data surface, so invariant 29's reasoning (the login page loads no data) does not cover it. The argument is different and is made rather than assumed - a decorative name is not the page's content, it cannot be retried into existence by anything the visitor would want to do, and surfacing an error alert for it would put a failure in front of a visitor whose actual task (seeing the hierarchy, signing out) is unaffected. Recorded against ARCHITECTURE.md's decision log (see "Deviations that need a decision-log entry").
100. The header never blocks the page beneath it. Whatever the name's status, the rest of the authenticated view renders.
101. The logout affordance is a real control: keyboard focusable, operable by Enter and by Space, with an accessible name from the catalogue and a visible focus indicator meeting the same contrast floor as every other control.
102. Signing out removes the session record from storage and navigates to the login route, which renders in its idle state with both fields empty. There is no confirmation prompt and no confirmation banner; no mockup carries either.
103. After signing out, no Back or Forward navigation **leaves the visitor on** an authenticated view. An attempt to reach one re-runs the guard and lands on the login page.

    The guarantee is deliberately stated as "does not leave the visitor there" rather than "never renders", because the two paths differ and only one of them can promise the stronger thing:

    - **A re-executed navigation** - the ordinary case - re-runs the loaders, so the guard decides before anything authenticated is constructed. Nothing is rendered. This half is the one a reviewer will actually exercise, and it is asserted end to end.
    - **A back-forward-cache restore** returns a frozen document with the authenticated view already in the DOM and no loader run. The app revalidates on restore, which re-runs the guard and redirects, but that happens *after* the browser has handed the document back - so a restored frame of authenticated content can be visible for the interval between restore and redirect. The interval is short and carries no data the visitor did not already see, and no client-side mechanism can close it. Claiming otherwise would be a claim no test in this suite can decide (see the review-dependent list).

    Neither path leaves a usable authenticated view behind, which is what this invariant is for.
104. Signing out is idempotent and safe when there is no session to clear: it lands on the login page either way, with no error.

### Keyboard and accessibility

105. Tab order through the card follows its reading order, with no `tabindex` anywhere reordering one against the other. Reading order is the DOM order invariant 24 fixes, so the order is: **any control inside a visible alert** (the alert sits between the heading block and the email field, so its retry affordance is reached first), then the email field, then the password field, then the Login control once it is active. While the control is inert it is absent from that order by invariant 35. Nothing in the card is reachable only by pointer, and nothing focusable is invisible.

    Only the service-problem alert has a control, so in practice the retry affordance is the only thing this puts before the fields, and only while that alert is showing. Putting the fields first instead would require either reordering the DOM against the visual layout or a positive `tabindex` - the first breaks screen-reader reading order, the second breaks every other tab stop on the page - and neither is worth it to move one control that the visitor is being asked to press.
106. Each field's accessible name is its visible label - "Email address", "Password". The placeholder `you@foo.com` is decoration and is never the field's name.
107. Enter pressed inside either field submits the form when the Login control is active, and does nothing when it is inert (invariant 34).
108. Both alerts - no-match and service-problem - are announced when they appear, and neither steals focus.
109. In the no-match state, both fields are marked invalid and both are described by the alert, so focusing either field announces the reason without the user having to find the alert.
110. Focus is never lost to the document body by any state transition on this page: not on submit, not on failure, not on retry, not on the alert appearing or clearing. The one transition that removes the focused element - pressing retry, which unmounts the alert the retry control lives in - hands focus to the busy Login control as part of the same transition (invariant 60). Every other transition on this page moves focus nowhere at all (invariants 44, 55, 64).
111. Every state of the card, and the header, pass an automated accessibility check with zero violations, in a real browser, in both themes.
112. Every interactive element on this page and in the header shows a visible focus indicator that holds 3:1 against its adjacent colours in both themes.
113. The keyboard path through the whole flow works end to end with no pointer: reach the email field, type, tab, type, submit with Enter, hear the outcome, and - on success - reach the header's logout affordance by tabbing and activate it.
114. The submitting state's non-editable fields remain in the tab order and remain announced with their values; they are not removed from the accessibility tree.
115. The spinner in the submitting state is not the only signal that work is happening. The control's text changes and its busy state is exposed programmatically.

### Internationalization

116. Every user-visible string added by this phase comes from a catalogue: both field labels, the placeholder, the heading, the subtext, the footer note, the submitting footer note, the Login and "Signing in…" control text, both alert messages, **the label that introduces the correlation id in the service-problem alert** (invariant 58 renders the id, and a bare 32-hex string with nothing naming it is unusable by the visitor it exists for), the retry affordance's label, the header's eyebrow, title, logout label, the neutral signed-in presentation and its busy label (invariant 99), and every document title. A hardcoded literal fails lint.
117. Auth strings live in the auth namespace and load with the login route; the header's strings load with the route that renders it. The login chunk carries no hierarchy strings.
118. Under the key-echoing test locale, every one of those surfaces renders its key, so tests assert against the catalogue's shape rather than a copy of its prose.
119. Any number, date or list this phase renders formats through `Intl`. No user-visible string is assembled by concatenation.
120. The card and the header lay out correctly with the document direction switched to RTL, with no code change beyond the direction and a catalogue.

### Telemetry

121. A sign-in attempt emits a typed event when it starts and a typed event when it settles, both carrying the interaction's correlation id. The settling event distinguishes three outcomes: signed in, no match, and service problem.
122. A no-match is not an error. It is not logged at error level and does not report to the error boundary; it is an expected outcome of a lookup.
123. A service problem is logged at error level with the correlation id, and that id is the one shown to the user (invariant 63).
124. A cancelled attempt emits neither a failure event nor an error log.
125. No telemetry payload, log line, trace attribute or error object emitted by this phase contains the email, the password or the derived secret **in full, nor any run of twelve or more consecutive characters of any of them** - including the lookup's recorded resource path, which is recorded in a form with the secret replaced rather than verbatim. This is asserted against the telemetry buffer, not argued. The wording is bounded for the reason invariant 76 gives: a literal "no substring" is unsatisfiable, and the pair of a whole-value check and a twelve-character-window check is what a test can actually decide. The uncovered residue - a fragment shorter than twelve characters - is named in the review-dependent list rather than papered over.
126. Signing out emits a typed event with the interaction's correlation id and no user-identifying payload beyond what the event catalogue declares.
127. The guard's redirects are visible in telemetry as ordinary navigations. A guarded redirect does not emit a route-viewed event for the route it refused.

### Security

128. The only request made while authenticating is the secrets lookup (invariant 14). Reviewers can check this from a network log without reading any code.
129. No credential material appears in the address bar, in a history entry, in a `from` parameter, in a referrer, in the rendered DOM, or in any storage entry.
130. The form never navigates as a GET submission, so a credential can never end up in a URL by the browser's default form behaviour.
131. The password's value exists in the password field and in the login page's own component state, which is where a controlled input necessarily keeps it (invariant 12), and it exists there only while that page is mounted. It reaches nothing else: it is not mirrored into a heading, an alert, a title, a data attribute, an `aria-*` attribute, a DOM text node, a URL, a history entry, storage or a telemetry payload, and it is not rendered as text in any state (invariant 39). Every one of those is asserted; "exists only as the field's value" is not, because it is not true of any controlled form and no test could decide it.
132. The derived secret does appear in the lookup's request URL, because the API's shape leaves no alternative. Everything the client controls around that is closed: the secret is not in the app's own URL, not in a log, not in a stored telemetry record, and not in storage. ARCHITECTURE.md's security posture states flatly that "secrets and passwords never enter URLs", which this request contradicts by construction; that wording is amended in this loop's decision-log entry to say what is actually guaranteed - the secret enters the one request URL the API's shape requires and nothing else, and the password enters nothing at all.
133. The gap this design does not close is stated plainly rather than papered over: a client-side lookup is not authentication, anyone can read the public database, and the app's guard is a user-experience boundary rather than a security boundary. The lookup stays isolated so a server-issued session replaces one module.
134. This phase adds no runtime dependency. The derivation is written against the recovered algorithm; no cryptography or hashing library is introduced, because the algorithm is neither.
135. The CSP is unchanged by this phase. No new origin is contacted, no inline style or script is introduced by any of the five states.

### What must not change

136. The route set stays `/`, `/login` and the not-found wildcard. No route is added by this phase; the hierarchy route gains a guard and a header, not a new path.
137. The not-found route's own content is unchanged - the same heading, the same copy, the same home link - and it remains unguarded (invariant 90), so it renders for a signed-in and a signed-out visitor alike. One behaviour that is reached *through* it does change, and it changes because the guard exists rather than because not-found was edited: its home link points at `/`, which is now guarded, so a signed-out visitor who follows it arrives at the login card instead of the hierarchy placeholder. That is the guard working correctly and it is named here so the change reads as a consequence rather than as an unnoticed regression. The existing not-found e2e coverage is updated to assert the signed-out and signed-in destinations separately.
138. The root and route error boundaries are unchanged, and no state of the login page routes through them. A failed lookup is a handled outcome, not a thrown error.
139. The phase 1 telemetry contract is unchanged: route-viewed and error-boundary events keep their names, payload shapes and correlation-id semantics. This phase's events are additions to the catalogue, not edits to it.
140. The browser console stays free of errors and warnings on every flow this phase adds, failure paths included, in the development server and in the production build alike.
141. The HTTP client, the configuration module, the observability facade, the i18n runtime and the UI kit's public surfaces are consumed as they are. A change to any of them to accommodate this phase is a design finding to raise, not a diff to slip in. This phase raises **four**, and the four are named so a reviewer decides them rather than discovering them: three additive kit changes - `Input` gains `readOnly`, `Input` gains `placeholder`, and `Button` gains busy-spinner support - and one platform change, the redaction rule that scrubs the secret out of a recorded resource path. A fifth change was considered and avoided: the failed-name avatar placeholder (invariant 99) is app-owned markup over the kit's exported `sizeClass`, not a new kit prop.
142. The UI kit stays domain-free. Nothing added by this phase puts a user, a session or a credential into a kit component's signature.
143. The hierarchy route's body remains phase 1's placeholder. This phase adds the header above it and the guard in front of it; the tree, the nav rail, the summary line, the per-row report counts and the "you" badge are phase 3.
144. Size budgets hold, including the per-route chunk ceiling for the login route with its lookup table.
145. No pipeline check is disabled, skipped or set to continue-on-error, and no coverage threshold is lowered, to make this phase green.
146. Nothing built here anticipates phase 3 - no tree code, no tree schema, no expansion state - and no abstraction is built whose only caller is a route that does not exist yet, **with one named exception**: the loader wrapper that applies the session guard to a child loader.

    The exception is carved out rather than left as a contradiction, and the reason is a property of the router rather than a guess about phase 3. React Router runs every matched route's loader **in parallel** and short-circuits on the first redirect, so a guard on a parent route does not stop a child's loader from having already started and fetched. Invariant 85 ("no data fetch before the guard decides") is satisfied in phase 2 only because the hierarchy route has no loader; the moment phase 3 gives it one, the invariant breaks silently and the failure looks like a passing test suite. The wrapper plus the structural check that every loader under the authenticated layout goes through it is what makes the invariant survive that change. It is a seam, it costs one small module, and its justification is invariant 85 in this phase's own terms - not a feature built early.

    Anything else discovered to have no phase-2 caller is a finding, not a precedent.

## Goals / Non-goals

**Goals**

- Port the credential derivation exactly, prove it against a real account, and hold it to a fixed recorded lookup table rather than to shape checks.
- Sign a user in with one request that is not the users table, and never fetch the password table to authenticate.
- Render all five states of the login card - idle, ready, submitting, no match, service problem - to the mockups, with the one deliberate deviation of invariant 52.
- Distinguish "your credentials do not match" from "the service could not answer", and give the second one a retry and a correlation id.
- Persist a session that holds a user id and a schema version, survives a reload, dies with the tab, and tolerates unavailable, corrupt and out-of-version storage without an error page.
- Guard authenticated routes before any data fetch, return the user to where they were headed, and keep a signed-in visitor out of the login form.
- Ship the header with the signed-in user and a logout affordance, and guarantee that Back cannot return to an authenticated view after signing out.
- Keep every credential out of every URL, log, telemetry event and storage entry, and assert it.

**Non-goals**

Belonging to phase 3:

- The tree domain, the users request and its tolerant per-row validation, the ARIA tree widget and its keyboard contract, URL-persisted expansion state, the nav rail, the summary line, per-row report counts, the "you" badge, and the README rewrite.

Deliberately not built at all:

- Real authentication. A client-side lookup against a public database is not authentication and is not presented as one.
- Registration, password reset, password change, "remember me", multi-factor, rate limiting, account lockout and session expiry. None is in GOAL.md, and none is implementable against this backend.
- A password-reveal control, a caps-lock warning, or client-side email format validation (invariant 38).
- Cross-tab session synchronisation, session sharing between tabs, or a broadcast sign-out. The session is tab-scoped by decision.
- Any user enumeration defence beyond the single combined message, which the derivation gives for free.
- Response caching, in this phase as in every other.

## Deviations that need a decision-log entry

ARCHITECTURE.md is binding, and this phase departs from it - or makes a decision durable enough to outlive this phase - in the places below.

**Status: the entries are written.** ARCHITECTURE.md's decision log carries all nine of them, and its two contradicted statements were amended at the same time - §3's runtime flow now reads `null -> summary alert`, and §4's security posture now separates the password (which enters nothing) from the derived secret (which enters exactly one request URL). This list therefore reads as the behavioural index of what was decided and why, not as work outstanding. What remains genuinely outstanding is only the mechanism half of entry 9, whose narrowings land with the milestone that needs them - TECH.md's matching list records which.

TECH.md's "Decision-log entries this phase owes ARCHITECTURE.md" is the same list with the mechanism and the file for each; this list is the behavioural half, so a reviewer can check one against the other.

1. **The null lookup produces a summary-only alert, not a field-level error.** ARCHITECTURE.md §3's runtime flow says "null -> field-level error". The derivation collapses both credentials into one secret, so no field-level attribution is possible (invariants 50-52). The entry amends the runtime-flow wording and records the reading of mockup 1d.
2. **"Secrets and passwords never enter URLs" is amended to what is actually guaranteed.** ARCHITECTURE.md §4's security posture states it flatly; the lookup URL contradicts it by construction (invariant 132). The entry states the guarantee that holds: the secret enters the one request URL the API's shape requires and nothing else, and the password enters nothing at all.
3. **The header presents three states, not four.** ARCHITECTURE.md §4 requires skeleton / error-with-retry / empty / data everywhere data is involved. The header fetches data and has skeleton / data / neutral, with no error state and no alert (invariant 99), for the reasons that invariant gives.
4. **The email is trimmed before the ported algorithm sees it.** A knowing deviation from the brief's `encode`, which passes the address through untouched (invariant 9). The entry records what it buys, what it costs, and that it happens outside the transcription.
5. **The derivation is transcribed byte-exact including its Unicode defect.** `Array.from`'s code-point iteration, the sub-32 array, and the `undefined ^ x` tail are preserved rather than corrected (invariant 7). The entry records that fidelity to the real database's secrets outranks defensible Unicode handling, and what a corrected version would have broken.
6. **Invariant 146 gains one named exception, the session-guard loader wrapper.** Built now, with no phase-2 caller, because React Router runs matched loaders in parallel (invariant 146, invariant 85).
7. **The redaction layer gains a path-segment rule.** ARCHITECTURE.md §4 describes redaction as scrubbing `password`, `secret` and `token` **keys**; the secret reaches telemetry inside a resource path's value, which that rule does not touch (invariant 125). A platform-module change, raised under invariant 141.
8. **`sessionStorage` is unbanned in exactly one file.** Phase 1 banned it outright and predicted phase 2 would remove the ban; it is narrowed to the single storage adapter instead, with the other four storage globals still banned everywhere (invariant 75).
9. **The `/secrets` literal ban and the `redirect` import ban are narrowed rather than removed.** Both are phase-1 guards written to fail if this phase's work started early (invariants 13, 84-91). The entry records the narrowing shape, so a later wholesale removal reads as a regression.
10. **Three additive kit changes and the reason each was not avoidable.** `Input.readOnly`, `Input.placeholder`, `Button`'s busy spinner (invariants 41, 106, 114, 141).
11. **A user id is restricted to a conservative charset at the parse boundary.** The backend's id shape is unconfirmed, so this app narrows what it will accept below what the database might serve, and treats the rest as malformed (invariant 18a). The entry records that a legitimate id outside the charset would be rejected, and why that trade is right.

## Open questions

All seven questions raised in the draft are settled. They are kept here with their answers rather than deleted, so a reviewer sees what was decided and by whom.

1. **How is the signed-in user's full name obtained for the header?** *Settled by the user:* one request for that single user record, made after authentication succeeds, with only the name fields kept and the record's password discarded at the parse boundary; held in memory for the page's lifetime, never persisted (invariants 97, 97a-97d). Rejected: storing the name in the session record, which widens what invariant 72 allows; and fetching the whole users collection, which pulls every plaintext password into the client for one name.
2. **What do the header's name position and avatar show while resolving, and if resolution fails?** *Settled:* a name-shaped skeleton and a placeholder avatar while resolving, and a neutral catalogue-drawn signed-in presentation with the placeholder avatar if it fails - space reserved in every case, no alert, no error state (invariant 99).
3. **ARCHITECTURE.md section 3 says a null lookup produces a "field-level error", which the summary-only alert replaces.** *Settled:* the deviation is real and is recorded as a decision-log entry in this loop, amending both the runtime-flow wording and the reading of mockup 1d (invariants 50-52). It is entry 1 of "Deviations that need a decision-log entry" above, which is the complete list rather than these two.
4. **ARCHITECTURE.md says secrets never enter URLs, which the lookup URL contradicts.** *Settled:* the same decision-log entry amends the wording to what is actually guaranteed (invariant 132). Entry 2 above.
5. **ROADMAP.md is out of date.** *Settled:* this loop edits it - phase 2's outcomes gain the fifth state and the sign-out scope moved in from phase 3, phase 3's outcome list loses it, and the progress log records the move.
6. **What shape does a user id arrive in?** *Settled without needing the answer:* a finite integer, or a non-empty string drawn only from `A-Z`, `a-z`, `0-9`, hyphen and underscore, are accepted as the same identifier; everything else - including a string carrying any character outside that charset - is a malformed response (invariant 18a). The charset is a security boundary, not a guess about the backend: the id reaches a request path and a stored record, so `../secrets` must never become an identifier.
7. **Which real account proves the derivation, and how is its password handled?** *Settled:* the live proof reads an account's email and password out of the public payload at run time rather than committing either, and runs only in the explicitly invoked live suite (invariant 6a).
