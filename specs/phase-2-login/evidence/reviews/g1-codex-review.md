# G1 second opinion - Codex (fresh thread, read-only)

Loop: phase-2-login (feature/L). Gate G1. Date: 2026-08-14.
Reviewer: Codex CLI 0.145.0, invoked through the codex plugin's rescue subagent with a
read-only brief and the four G1 questions (completeness, internal consistency, feasibility
against the real code, testability). The Claude-side forwarder subagent was killed by an
account spend limit before it could relay the answer; the Codex run itself completed, and
this record is its final message recovered verbatim from the session transcript at
`~/.codex/sessions/2026/08/14/rollout-2026-08-14T16-44-34-01a000f2-4da9-70e3-9c68-c728fd7f6d39.jsonl`.

Material: `specs/phase-2-login/PRODUCT.md` and `specs/phase-2-login/TECH.md`.

Saved verbatim as it was returned.

---

25 findings (19 blocking)

1. The specified non-BMP derivation differs from the brief’s JavaScript | `docs/task.md:40-44`; `specs/phase-2-login/PRODUCT.md:29-35`; `TECH.md:364-376` | `Array.from` iterates code points and `charCodeAt(0)` retains only each high surrogate, whereas the specs process both UTF-16 units; recomputation for `😀` produced 16 original units and secret `C8…C869…69`, versus 32 alternating units and `C869…C869`, so plausible secrets silently differ | BLOCKING
2. TECH incorrectly claims inherited timeout retry behavior | `PRODUCT.md:53`; `TECH.md:62-68,1042-1049`; `src/platform/http/createHttpClient.ts:103-133,161-180` | A deadline abort returns `timeout` immediately at lines 121-133, before `shouldRetry` is reached; changing this would modify the HTTP client despite invariant 141, while leaving it unchanged contradicts the stated retry contract | BLOCKING
3. Returning the header promise directly from a loader blocks navigation instead of enabling Suspense | `TECH.md:684-700`; `node_modules/react-router/dist/development/lib/router/router.js:2441-2446` | React Router executes `result: await ... actualHandler()`, so a bare `store.read()` promise settles before rendering; the name skeleton and non-blocking page promised by invariants 99-100 never appear unless the promise is wrapped inside a synchronously returned object | BLOCKING
4. The proposed in-action ref does not suppress queued `useActionState` submissions | `TECH.md:756-765,1365-1369`; `node_modules/react-dom/cjs/react-dom-client.development.js:8362-8367,8434-8446` | React queues the second action and starts it only after the first succeeds; by then the first action’s `finally` has cleared the ref, so the queued action derives and requests again | BLOCKING
5. The in-memory session shadow does not override stale valid storage | `PRODUCT.md:131-136`; `TECH.md:532-542` | Because `readSession` consults storage first and uses the shadow only when storage returns nothing, a failed write over an older valid record authenticates the old user; a failed removal can likewise redirect a just-signed-out user back inside | BLOCKING
6. Controlled credential state contradicts the product’s credential-lifetime rules | `PRODUCT.md:40,83-90,212`; `TECH.md:724-729,1021-1024,1359-1364` | `useState` necessarily copies the password outside the field and keeps it after submission, while invariants 12 and 131 say it exists only as the field value and is not copied into a longer-lived variable; the proposed result-union test cannot observe that known copy | BLOCKING
7. Invariant 49 says success leaves the URL at `/login`, contradicting the success invariants | `PRODUCT.md:91,117-122`; `TECH.md:774-775` | Implementing invariant 49 literally prevents navigation, while implementing 66-70 necessarily changes the URL; TECH silently chooses the latter | BLOCKING
8. The service alert’s placement conflicts with the required tab order | `PRODUCT.md:60,107,177`; `TECH.md:1059-1062,1124-1125,1232-1233` | An alert rendered before the email field naturally puts its retry button before both fields, but invariant 105 requires email, password, Login, then alert controls; the plan supplies no DOM structure capable of satisfying both | BLOCKING
9. Retrying removes the focused retry button without a focus handoff | `PRODUCT.md:107-113,182`; `TECH.md:767-772,1124-1127,1232-1233` | Starting retry removes the alert and its control, normally returning focus to `body`, contrary to invariant 110; TECH specifies no move to the busy Login control | BLOCKING
10. The binding architecture still contains both conflicts PRODUCT claims were amended | `ARCHITECTURE.md:61,133-136`; `PRODUCT.md:97,213,266-267`; `TECH.md:919-920` | Architecture still requires a field-level error and says secrets never enter URLs; its decision log ends without the promised phase-2 amendments, so implementation currently has two incompatible binding contracts | BLOCKING
11. The proposed `/secrets` `FILE_ALLOWLIST` cannot affect the literal ban | `TECH.md:405-412,914-918`; `scripts/assert-domain-vocabulary.mjs:113-135,138-161` | `FILE_ALLOWLIST` is consulted only for exported vocabulary, while the `/secrets` check at lines 159-161 is unconditional; the proposed file still fails lint unless that separate check is redesigned | BLOCKING
12. Arbitrary string user IDs are interpolated into a URL path without encoding | `PRODUCT.md:51`; `TECH.md:224-226,414-421,469-475` | The accepted id `../secrets` resolves `/users/../secrets.json` to `/secrets.json`; `/`, `?`, `#`, and backslashes similarly alter the resource, so a malformed secret response or stored session can fetch an unintended path | BLOCKING
13. The literal “no substring” privacy invariants are impossible and the tests weaken them silently | `PRODUCT.md:130,203`; `TECH.md:897-902,1147-1152,1265-1271` | A one-character password such as `1` necessarily overlaps ordinary JSON such as the schema version, while the tests check only the complete credential strings and would pass if a prefix or other substring leaked | BLOCKING
14. Email trimming is an unrecorded change to the original derivation | `docs/task.md:47-54`; `PRODUCT.md:37`; `TECH.md:371-376` | The brief passes `email` directly to `make32`; trimming inside `deriveSecret` changes the bytes for stored addresses with boundary whitespace, and the normal live account proof is unlikely to discriminate this divergence | BLOCKING
15. `withSessionGuard` directly violates invariant 146 | `PRODUCT.md:230`; `TECH.md:642-650,1306-1309,1348-1353` | TECH explicitly builds an abstraction with no phase-2 caller for phase 3, while invariant 146 explicitly forbids abstractions whose caller does not exist yet | BLOCKING
16. The bfcache mitigation cannot establish invariant 103’s no-render guarantee | `PRODUCT.md:172`; `TECH.md:667-673,1223-1226,1325-1326,1354-1358` | `pageshow` revalidation happens after a cached document is restored and TECH admits the browser behavior is not tested, so stale authenticated DOM may be visible before redirect | BLOCKING
17. Back/Forward behavior across login states is neither specified nor browser-tested | `PRODUCT.md:83-113`; `TECH.md:1104-1107,1177-1195` | Tests cover component unmount and reload, but not Back during a held request or Forward restoring ready/no-match/service-problem state; bfcache can preserve field values or a frozen request without running React cleanup | BLOCKING
18. Nothing proves the production header can ever resolve a real name | `docs/reference.md:13`; `TECH.md:469-477,889-896,1202-1211,1398-1404` | All successful header checks use mocked records, while the live suite proves only credential-to-secret lookup; implementation could pass every gate and always show the neutral fallback against the real schema | BLOCKING
19. The proposed no-flash assertion cannot observe a transient paint | `TECH.md:1179-1182`; `PRODUCT.md:143` | A `domcontentloaded` snapshot plus a later zero-count assertion can both miss content inserted and removed between those observations; a preinstalled mutation observer or trace is needed | BLOCKING
20. Two-tab behavior is incorrectly classified as review-only | `PRODUCT.md:127-128,137`; `TECH.md:1153-1155,1313-1315` | Independent tabs, opener-created duplicated tabs, and one-tab logout are observable in Playwright/latest Chrome, so the review-dependent list is not honest or complete | non-blocking
21. Invariant 43’s proposed test proves one request but not one derivation | `PRODUCT.md:85`; `TECH.md:756-765,1095-1097` | Counting transport calls passes if derivation runs twice but a downstream guard suppresses the second request | non-blocking
22. The invariant 113 test map omits the stated end-to-end keyboard login flow | `PRODUCT.md:185`; `TECH.md:1219-1220` | The mapped check starts at the authenticated page body and exercises logout; it does not type credentials, submit with Enter, or verify the login outcome without a pointer | non-blocking
23. TECH’s invariant-87 citation is wrong | `TECH.md:816-817,1342-1347`; `PRODUCT.md:144` | PRODUCT invariant 87 says the guard redirect replaces history; it says nothing about UI-kit state inventory coverage | non-blocking
24. TECH misquotes the Button source comment | `TECH.md:114-118`; `src/shared/ui/Button.tsx:27-39` | The actual comment says busy handling skips the caller and native submit; it does not name phase 2 or login as the first caller | non-blocking
25. The binding verification profile still states the obsolete 100 kB entry budget | `VERIFICATION.md:83-86`; `ARCHITECTURE.md:173-174`; `.size-limit.json:2-7` | TECH correctly plans against 150 kB, but reviewers following VERIFICATION.md receive a contradictory limit | non-blocking

Completeness

All requested files were readable and were opened. Hostile `from` handling, reload mid-submission, normal aborts, corrupt/old storage, and unresolved-name fallback are described. Missing or inadequate coverage remains for stale valid storage after failed writes/removals, retry focus, arbitrary user-id path characters, browser Back/Forward across every login state, real two-tab flows, and a live successful header-name resolution.

Internal consistency

PRODUCT conflicts with itself on successful navigation, controlled credential lifetime, alert placement versus tab order, and the literal substring prohibition. It conflicts with the original algorithm on non-BMP input and trimming. TECH conflicts with invariant 146 and still depends on architecture amendments that are not present. The cited PRODUCT numbers otherwise generally match, apart from the invariant-87 kit-coverage citation.

Feasibility

The layer layout is mostly permitted by `eslint.config.js`: app-to-feature, feature-to-platform/shared, and platform-to-shared-utils are allowed. The planned `/secrets` allow-list does not work against the actual unconditional script check. React Router supports lazy loaders and `replace()` redirects, and the cited `X-Remix-Replace` behavior is present, but it awaits a bare loader promise. Its parallel-loader warning is correct. Tree-shaking the table out of the entry chunk is realistic for this ESM build, and the build-output assertion plus narrow-entry fallback is a reasonable proof strategy.

Testability

Most invariants have an appropriate test category, but the map is not fully discriminating: request counts do not prove derivation counts, snapshots do not prove no transient paint, component unmount does not prove browser-navigation cancellation, and the mapped keyboard test omits login. Two-tab invariants are browser-testable and should not be review-only. The bfcache limitation is disclosed honestly but leaves invariant 103 unproven.

For the table, the current literal recomputes to 256 entries, range 0-255, with 32-bit FNV-1a `05311407`. Deep equality against unchanged `docs/task.md` prevents an ordinary corrupted implementation table from passing. If both source copies are corrupted, the fixed checksum catches normal drift, although a 32-bit collision or updating the expected constant would still pass; recording `05311407` explicitly before implementation would remove ambiguity about the expected value.
