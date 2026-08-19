# G1 fix confirmation - Claude (fresh re-briefed instance, read-only)

Loop: phase-2-login (feature/L). Gate G1. Date: 2026-08-14.
Claude-side role subagents have no thread continuity, so per the M-path rule the raiser's
confirmation is an independent re-check: a FRESH `agentic-loop:loop-spec-validator` instance,
re-briefed with the original 19 findings and the six binding user decisions, asked to judge the
current text rather than the intent. It did not raise the findings and did not make the edits.

Saved verbatim as it was returned.

---

## Per-finding verdicts

**Claude-1 - invariant 7 vs the brief's `Array.from` - CONFIRMED**
PRODUCT.md:35-42: *"The brief's algorithm is transcribed byte-exact, including the part of it that is a Unicode defect... A non-BMP character survives truncation as *one* element whose `charCodeAt(0)` is its **high surrogate only**... The normalised array is therefore shorter than 32... The derivation still reads all 32 positions, so the tail positions read `undefined`. `undefined ^ x` evaluates to `x`."* Invariant 4 was amended in the same pass (PRODUCT.md:30, *"because a missing entry participates in the exclusive-or as `undefined`"*), TECH.md:458-479 states the return array is *"32 or fewer"* with *"no padding, no fallback and no repair"*, and the test-map entries for 4 and 7 (TECH.md:1508-1511, 1522-1535) assert the short-array case and compute expectations by evaluating the brief's own source. I verified `docs/task.md:37-57` directly: line 44 is the `Array.from` return, line 51 the 0-31 loop, line 52 the `& 0xff`. The defect is described, not corrected.

**Claude-2 - `from` cannot carry the hash - CONFIRMED**
PRODUCT.md:172: *"carrying the requested **path and search** as the `from` value... The **fragment is not carried**, and that is a stated limitation"*, with the `stripHashFromPath` mechanism named and `window.location.hash` explicitly rejected. Invariant 92 (PRODUCT.md:185) matches: *"a path and, where the guarded request had one, its search string - never a fragment (invariant 84)."* TECH.md:843-850 and the 84/85/86 map entry (TECH.md:1800-1801, *"**no case asserts a fragment**"*) agree. Verified against the installed router: `createClientSideRequest` at `router.js:2604-2605` builds the URL through `stripHashFromPath`.

**Claude-3 - unconditional `replace()` - CONFIRMED**
PRODUCT.md:175-180 now splits invariant 87 into the current-entry case (*"The redirect must *replace* that entry"*) and the in-app push case (*"Here the redirect must *push*... Forcing a replace in this case overwrites **page A's** entry"*), closing with *"the guard chooses per navigation."* TECH.md:869-874 gives the discriminator (`window.location.pathname+search === guardedLocation`) and TECH.md:1802-1812 runs the e2e twice, the push variant using the existing `e2e/not-found.spec.ts:18-24` home-link click. I verified `replace` exists as a public export (`react-router/dist/development/index.d.ts`), that it sets `X-Remix-Replace` (`utils.js:774-777`), and that `router.js:1024` promotes that header to `"REPLACE"`.

**Claude-4 - invariant 14 vs 97 (two-place fix) - CONFIRMED**
Both sides moved. PRODUCT.md:56 now reads *"Nothing on the users path is requested **while authenticating**... The window this invariant bounds opens when the submission starts and closes when the lookup settles"*, with PRODUCT.md:58 conceding the header's later `/users/<id>.json` explicitly; invariant 97 (PRODUCT.md:193) says the same from its side. The two network checks are now complementary rather than contradictory: TECH.md:1559-1569 (*"**windowed** so it survives M4"* … *"a flat 'exactly one request… and no path contains `users`' goes green in M2 and **must** go red in M4"*) and TECH.md:1835-1841 (*"exactly one request to `/users/<id>.json` **after** the authentication window closes"*). Invariant 128 (PRODUCT.md:260) is scoped to *"while authenticating"* and needs no further change.

**Claude-5 - the guard breaks existing e2e specs (two-place fix) - CONFIRMED**
TECH.md:1430-1449: *"**M3 owns the migration of every existing e2e spec that visits a route this milestone guards**"*, enumerating seven files (it adds `development-console.spec.ts`, which the original finding missed). Invariant 143's check is restated at TECH.md:1446-1449 and 1983-1989: *"asserted **by a direct file assertion plus its own component test**, not by 'the existing placeholder tests still passing untouched'"*. Invariant 137 (PRODUCT.md:272) now names the home-link behaviour change: *"a signed-out visitor who follows it arrives at the login card instead of the hierarchy placeholder… The existing not-found e2e coverage is updated"*, and the map entry 90/137 (TECH.md:1816-1822) asserts the destination per session state. I confirmed each cited spec exists and visits `/` unauthenticated. (An adjacent M2-timing gap the enumeration does not cover is recorded under damage, below.)

**Claude-6 - M2 unverifiable without M1's runtime fields - CONFIRMED**
TECH.md:767-773: *"**Both fields land in M1, not in the milestone that first reads them.**… scheduling the field in M3 would make M2's boundary a command that cannot go green."* M1's deliverables carry it verbatim (TECH.md:1384-1385, 1390-1394) including `renderRoute.tsx`'s fakes. The corollary is also handled: M2 explicitly narrows `e2e/telemetry-buffer.spec.ts`'s storage assertion (TECH.md:1416-1418, *"its `sessionStorageLength === 0` assertion (lines 44-50) is narrowed here to 'empty before sign-in, exactly one entry after'"*) - I verified those are the real line numbers (`e2e/telemetry-buffer.spec.ts:44-50`).

**Claude-7 - retry destroys the focused control (two-place fix) - PARTIAL**
The mechanism now exists: PRODUCT.md:130 (*"focus is **moved deliberately, as part of the same transition, to the Login control** in its busy state"*), invariant 110 carved out at PRODUCT.md:233 (*"The one transition that removes the focused element… hands focus to the busy Login control… Every other transition on this page moves focus nowhere at all"*), TECH.md:1141-1157 (ref on the Login control, focused in the same commit), and a specific check at TECH.md:1703-1712.
What still fails: **invariant 44 was not amended and now contradicts invariant 60.** PRODUCT.md:103 states without exception: *"The transition into and out of this state **moves focus nowhere**: whatever held focus when the submission started still holds it afterwards."* A retry-started submission *is* a transition into the submitting state, and 60 requires focus to move (the element that held it is unmounted). Both PRODUCT.md:130 (*"invariants 44, 55, 64 and 110 are written so that it is the named exception"*) and TECH.md:1153-1155 (*"invariants 44, 55 and 64 all say 'moves focus nowhere', and invariant 60 names this as the exception"*) assert a carve-out that only 110 actually carries. The test map for 44 (TECH.md:1659-1663) asserts *"the same element before and after the transition into and out of submitting"* with two start cases (pointer, Enter-in-field) and never says the retry start is out of scope - a test author covering the third start path writes a test that a correct implementation fails. One clause in 44 ("except when the submission is started from the retry control, where invariant 60 governs") closes it. Non-blocking only if the implementer reads 110 first; treat as BLOCKING for the invariant text, since 44 is an invariant a test is written from.

**Claude-8 - invariants 44/55 vs 107 (two-place fix) - CONFIRMED**
Both reworded to the transition form. PRODUCT.md:103: *"That is deliberately stated as 'does not move' rather than 'stays on the Login control', because invariant 107 makes Enter inside either field a submission path."* PRODUCT.md:120: *"**its appearance moves focus nowhere**: whatever held focus when the response arrived still holds it… the invariant is about the transition, not about a particular element."* The checks moved with them: TECH.md:1659-1663 and 1691-1694 both assert *"the same element"* and run each case twice, once from the control and once from Enter inside a field.

**Claude-9 - the `/secrets` allow-list shape - CONFIRMED**
TECH.md:542-557: *"narrowing the ban that forbids it needs a **new mechanism, not an entry in an existing map**… `checkWholeScopeVocabulary` gains its own path-keyed allow-list, keyed the same way and named distinctly (`WHOLE_SCOPE_FILE_ALLOWLIST`)"*, with both-direction assertions in `scripts/guard-scripts.test.ts` and the same correction repeated in Risks (TECH.md:2121-2124). Verified against the script: `FILE_ALLOWLIST` at `scripts/assert-domain-vocabulary.mjs:46-48` is consulted only at line 119/126 inside `checkExportedVocabulary`, and the `/secrets` test at lines 159-161 is unconditional inside `checkWholeScopeVocabulary`.

**Claude-10 - the `redirect` ban lives in two blocks - CONFIRMED**
TECH.md:884-895: *"`eslint.config.js:549-569` and `eslint.config.js:570-591` carry the identical `redirect`/`redirectDocument` ban, and the second one - scoped to `src/features/*/**/*.{ts,tsx}` - is the effective configuration… Narrowing only the first would leave every guard file failing lint."* Repeated in Context (TECH.md:166-177), Risks (TECH.md:2118-2120), M3's deliverables (*"the `redirect` import-ban narrowing **in both ESLint blocks**"*, TECH.md:1428) and decision-log entry 9 (TECH.md:2197-2200). I verified both blocks exist with identical `importNames` and the stale *"invariant 97"* message (`eslint.config.js:556-569` and `578-591`), that `replace` is on neither list, and that `scripts/eslint-configuration.test.ts:262` probes that message. (Line-boundary drift noted under damage.)

**Claude-11 - the Button spinner as the third kit finding - CONFIRMED**
PRODUCT.md:276: *"This phase raises **four**… three additive kit changes - `Input` gains `readOnly`, `Input` gains `placeholder`, and `Button` gains busy-spinner support - and one platform change"*. TECH.md:1232-1244 raises it as change 3 with what it costs (*"`Button` renders `{children}` and nothing else… `VARIANT_CLASS.primary`'s pressed fill is `hover:bg-primary-pressed`"* - both verified at `src/shared/ui/Button.tsx:14, 49-51`), the map for 141 names all four (TECH.md:1973-1980), Risks records it (TECH.md:2061-2070), `Button.tsx` is in the file layout as CHANGED (TECH.md:327), M2 delivers it (TECH.md:1406) and decision-log entry 10 covers it on both sides (PRODUCT.md:328, TECH.md:2201-2202).

**Claude-12 - "any substring" unsatisfiable - CONFIRMED**
PRODUCT.md:152-154 and 254 now read *"**neither the email, the password nor the secret in full, and no run of twelve or more consecutive characters of any of them**"*, with the reasoning for the pair stated and the uncovered residue named. TECH.md:1356-1370 specifies the window loop and the surfaces it runs against; the map entries for 72/76, 71/129/131 and 125 all state both halves; the residue appears in the partially-review-dependent list (TECH.md:2032-2036).

**Claude-13 - invariant 86's check and its absence from the honesty list (two-place fix) - CONFIRMED**
Both places moved. The check is now a pre-installed observer: TECH.md:1790-1799, *"assert the hierarchy heading was **never inserted into the document** - by a `MutationObserver` installed through `page.addInitScript` before the navigation… The originally proposed check… samples two discrete moments and is blind to anything inserted and removed between them"*, mirrored at TECH.md:945-962. And 86 is now in the partially-review-dependent list (TECH.md:2037-2041) with the structural argument named as the covered half; the list's preamble (TECH.md:2008-2010) records the correction.

**Claude-14 - the header's missing decision-log entry - CONFIRMED**
PRODUCT.md:210: *"This is a deliberate departure from ARCHITECTURE.md's 'four states everywhere data is involved': the header's fetch *is* a data surface, so invariant 29's reasoning (the login page loads no data) does not cover it."* The argument is made (a decorative name cannot be retried into existence) and the entry exists on both lists: PRODUCT.md:321 item 3 and TECH.md:2185-2186 (*"Lands in M4"*).

**Claude-15 - the permanently pulsing failed avatar - CONFIRMED**
PRODUCT.md:206-208: *"the avatar shows a **static** placeholder shape… the failed case does not reuse the loading skeleton; it renders a plain, unanimated shape of the same reserved box."* TECH.md:1040-1054 gives it a module (`SignedInAvatarPlaceholder`, app-owned, `sizeClass[SkeletonSize.avatar]`, no `animate-pulse`) and the map asserts the distinction directly (TECH.md:1863-1867). Verified the premise: `Skeleton.tsx:38-39` hard-codes `aria-hidden="true"` and `animate-pulse`, and `sizeClass.avatar` is `h-[34px] w-[34px]`, identical to `Avatar`'s medium size.

**Claude-16 - component tests of the success path have no router - CONFIRMED (for the named scope)**
TECH.md:1.2 (376-394) injects navigation: *"`navigate` is a dependency rather than a `useNavigate()` call inside the page for a mechanical reason… `renderRoute.tsx:73-81` renders `<ApplicationRoot runtime={runtime}>{children}</ApplicationRoot>` with **no router of any kind**"*, and the map for 130 asserts the spy (TECH.md:1948-1950). I verified `renderRoute.tsx` has no `RouterProvider`/`MemoryRouter`. The success-path checks (65, 66, 130) are now runnable without a router. A second consequence of the same "it does not gain a router" decision, on the header side, is recorded under damage below.

**Claude-17 - M3/M4 overlap - CONFIRMED**
TECH.md:1423-1426: M3 delivers *"the pathless authenticated layout route **and the `AuthenticatedLayout` shell itself, its `authenticatedLoader`, and the `signedInUserStore` wiring the loader reads** - M4 adds only what renders inside the header, not the route that holds it"*, and M4 (TECH.md:1462-1465) is scoped to the header's contents with *"The layout route and the loader it hangs off already exist from M3, so this milestone adds no routing."* The `createRuntime` half is unambiguous now that both fields land in M1 (TECH.md:767-773).

**Claude-18 - no catalogue key for the correlation-id label - CONFIRMED**
TECH.md:1265 adds `serviceProblemCorrelationLabel` to the enumerated `auth.json` keys, with TECH.md:1268-1276 explaining why a separate key beat interpolation, and PRODUCT.md:242 adds the surface to invariant 116: *"**the label that introduces the correlation id in the service-problem alert** (invariant 58 renders the id, and a bare 32-hex string with nothing naming it is unusable by the visitor it exists for)"*. M2's deliverables name the key (TECH.md:1404-1405).

**Claude-19 - the "empty spy sink" check - CONFIRMED**
TECH.md:1602-1611: *"**no error-level record and no `auth.sign_in_settled`**. Not an empty sink: a caller-aborted request emits two records before returning `cancelled`… An empty-sink assertion would fail on a correct implementation."* Matches `createHttpClient.ts:104-118`, which the original finding cited.

---

## Numbering damage, dangling cross-references, new contradictions

**D1 - The header's component tests have no data router, and TECH now rules one out. BLOCKING.**
`specs/phase-2-login/TECH.md:393-394`: *"`renderRoute` still gains the fake `tabStorage` and the store described in section 5.1, because the header's component tests need them; it does **not** gain a router."* But `specs/phase-2-login/TECH.md:1015` specifies *"`SignedInName` reads `useLoaderData().signedInUser` with `use()` inside a `<Suspense fallback=…>`"*, and the map schedules 97c (`TECH.md:1847-1849`, five cases, each asserting *"renders the page beneath"*), 98 (`:1858`), 99 (`:1860-1867`) and 100 (`:1870`) as **component** tests, which section 9 (`TECH.md:1338-1339`) says run through `renderRoute`. `useLoaderData` throws outside a data router (`/hierarchy-tree/src/app/testing/renderRoute.tsx:73-81` renders only `ApplicationRoot`), and "the page beneath" is a child route. Either `SignedInName` takes the promise as a prop (the app-layer parent reading `useLoaderData`), or these move to e2e, or `renderRoute` gains a memory data router - the spec currently says none of the three.

**D2 - M2 breaks five existing e2e assertions that no milestone owns, while M2's boundary claims a green `npm run e2e`. BLOCKING for M2.**
`specs/phase-2-login/TECH.md:1375` requires *"`npm run e2e` from M2 onward"*, and M2 deletes `AuthPlaceholderPage` and its three catalogue keys (`TECH.md:333`, `:1262-1266`), so the login heading key becomes `login.heading`. These assert the old key or prose and are named in neither M2's deliverables (`TECH.md:1402-1421`) nor M3's migration list (`TECH.md:1430-1445`, which cites only `placeholder-routes.spec.ts:5-29` and `:48-67`, deliberately skipping the login test):
- `/hierarchy-tree/e2e/placeholder-routes.spec.ts:41-44` (`'login.title'`, `'login.documentTitle'`)
- `/hierarchy-tree/e2e/telemetry-buffer.spec.ts:40-42` (`'login.title'`)
- `/hierarchy-tree/e2e/accessibility.spec.ts:7` (`{ path: '/login', heading: 'login.title' }`)
- `/hierarchy-tree/e2e/right-to-left.spec.ts:36` (same entry)
- `/hierarchy-tree/e2e/deployed-smoke.spec.ts:25-33` (`"Sign in isn't built yet"`) - post-merge, so it fails after merge like the `/` half already flagged.

**D3 - The third ESLint block may silently drop the sinks ban for the guard directory. Non-blocking.**
`specs/phase-2-login/TECH.md:889-891`: *"both permit `redirect` inside `src/features/auth/guard/**` only, expressed as a third block scoped to that directory that re-states the rule with `redirectDocument` alone."* Flat config replaces a rule's options rather than merging them (TECH's own premise), so a third block that states only `paths` drops `patterns: [SINKS_IMPORT_PATTERN]`, which `/hierarchy-tree/eslint.config.js:589` carries for feature files. The spec should say the third block repeats the sinks pattern - this is exactly the "narrowing that does not narrow" its own Risks section warns about.

**D4 - M1 must add `createSignedInUserStore` but does not list it. Non-blocking.**
`specs/phase-2-login/TECH.md:1384-1385` puts *"`createRuntime`'s `tabStorage` and `signedInUserStore` fields"* in M1, and `TECH.md:762-764` builds the field from `createSignedInUserStore({ http, observability })`, yet M1's file list (`TECH.md:1380-1382`) names only the lookup files under `data/`, and M4 delivers *"`createSignedInUserStore`'s fetch half"* (`TECH.md:1463`). The module shell plus its barrel export (`TECH.md:351-352`) are implied by `TECH.md:773` (*"the store is constructed there and simply has no reader until M4"*) but absent from the deliverable list a milestone plan will be written from.

**D5 - Citation drift introduced or left by the edit pass (none creates ambiguity, all are cheap to fix). Non-blocking.**
- `specs/phase-2-login/TECH.md:884-885`, `:2118`, `:2199` cite the two `redirect`-ban blocks as `549-569` and `570-591`; the actual blocks are `eslint.config.js:549-571` and `eslint.config.js:572-593` (the second citation's start lands inside the first block). The `files` globs quoted alongside are correct, so the intent is unambiguous.
- `specs/phase-2-login/TECH.md:1433-1435` cites `placeholder-routes.spec.ts:5-29` / `:48-67`; the tests are at `:6-30` and `:49-68`.
- `specs/phase-2-login/TECH.md:1044-1045` cites `Skeleton.tsx:37, 39` for `aria-hidden`/`animate-pulse`; `aria-hidden` is line 38.
- `specs/phase-2-login/TECH.md:1150-1151` cites `Button.tsx:44-46` as *"sets `aria-busy`/`aria-disabled` without setting `disabled`"*; line 44 is `disabled={disabled}` and the aria attributes are 45-46. The substantive claim holds.
- `specs/phase-2-login/TECH.md:548` gives `checkWholeScopeVocabulary` as lines 138-161; the function runs to 168 (the literal test at 159-161 is correct).

**Numbering integrity: clean.** PRODUCT.md's invariants run 1-146 with no gap, no duplicate and no renumbering; every number the grill quoted still holds its original subject, and each one whose text changed changed *because* it was the resolution (7, 12, 14, 44, 55, 60, 76, 84, 87, 92, 97, 99, 110, 116, 125, 131, 137, 141, 146, 18a). Additions are sub-lettered (6a, 18a, 48a, 79a, 97a-97e), 97e being new for the live header proof. I walked the full test map: all 146 invariants plus every sub-letter still have an entry, and no map entry points at a number that has changed meaning.

---

**18 of 19 CONFIRMED, 1 PARTIAL (Claude-7).** These specs are not yet implementable as written: M1 and M3 are clean, but M2's boundary cannot go green until D2's five e2e assertions are assigned, M4's header checks cannot be written as mapped until D1 is settled, and invariant 44 needs the one clause that Claude-7's resolution claims it already has.
