# G1 fix confirmation - Codex (raiser's own thread, read-only)

Loop: phase-2-login (feature/L). Gate G1. Date: 2026-08-14.
Per the Codex contract, a fix confirmation returns to the thread that raised the findings, so
this ran as `codex exec resume 01a000f2-4da9-70e3-9c68-c728fd7f6d39` - the same session that
produced `g1-codex-review.md` - rather than as a fresh opinion. It was told the six binding
user decisions and asked to judge the current text, not the intent.

Saved verbatim as it was returned.

---

1. CONFIRMED - The port now preserves `Array.from` code-point iteration, high-surrogate-only astral handling, shortened arrays, and the `undefined` XOR tail exactly as `docs/task.md:37-54` requires (`specs/phase-2-login/PRODUCT.md:35-42`; `specs/phase-2-login/TECH.md:458-495`).
2. CONFIRMED - Timeout is now explicitly non-retryable on the actual client path and tested as one transport call (`specs/phase-2-login/PRODUCT.md:70`; `specs/phase-2-login/TECH.md:77-88,1592-1598`).
3. CONFIRMED - `authenticatedLoader` synchronously returns `{ signedInUser: promise }`, with the bare-promise blocking behavior explicitly rejected (`specs/phase-2-login/TECH.md:808-825`).
4. CONFIRMED - The plan prevents dispatch in `onSubmit` while pending and checks both the started-event count and transport count (`specs/phase-2-login/TECH.md:1111-1139,1651-1658`).
5. CONFIRMED - The in-page session shadow is authoritative over stale storage for failed writes and failed removals (`specs/phase-2-login/PRODUCT.md:159-164`; `specs/phase-2-login/TECH.md:711-737`).
6. CONFIRMED - The password boundary now expressly permits the controlled field and page component state while mounted and forbids every named external destination (`specs/phase-2-login/PRODUCT.md:49-51,263`).
7. CONFIRMED - Invariant 49 now limits URL stability to submission and failure, while explicitly assigning success navigation to invariants 66-70 (`specs/phase-2-login/PRODUCT.md:111`; `specs/phase-2-login/TECH.md:1164-1170`).
8. CONFIRMED - The alert's DOM position and invariant 105 now agree that an alert control precedes the fields in tab order (`specs/phase-2-login/PRODUCT.md:77,226-228`; `specs/phase-2-login/TECH.md:1183-1200`).
9. CONFIRMED - Retry now deliberately transfers focus from the removed retry control to the busy, focusable Login control (`specs/phase-2-login/PRODUCT.md:128-130,233`; `specs/phase-2-login/TECH.md:1141-1157`).
10. PARTIAL - PRODUCT and TECH now enumerate the required decision-log amendments, but binding `ARCHITECTURE.md` still says `null -> field-level error` and that secrets never enter URLs (`specs/ARCHITECTURE.md:61,134`; `specs/phase-2-login/TECH.md:2172-2186`).
11. CONFIRMED - TECH now explains that `FILE_ALLOWLIST` cannot affect the unconditional `/secrets` check and specifies a separate whole-scope path allow-list with positive and negative tests (`specs/phase-2-login/TECH.md:541-557`).
12. PARTIAL - The parser boundary and path encoding are correctly specified, but PRODUCT's settled answer still says every non-empty string is accepted and TECH's file-layout summary still says `null | non-empty string | finite integer`, contradicting the conservative charset (`specs/phase-2-login/PRODUCT.md:64-68,340`; `specs/phase-2-login/TECH.md:287,559-600`).
13. CONFIRMED - The impossible no-substring claims are replaced with whole-value and twelve-character-window checks, with shorter-fragment residue disclosed as review-dependent (`specs/phase-2-login/PRODUCT.md:152-154,254`; `specs/phase-2-login/TECH.md:1356-1370`).
14. CONFIRMED - Email trimming is explicitly identified and tested as a knowing preprocessing deviation outside the byte-exact port (`specs/phase-2-login/PRODUCT.md:44-46`; `specs/phase-2-login/TECH.md:481-509,1538-1543`).
15. CONFIRMED - Invariant 146 now names `withSessionGuard` as its sole exception and TECH builds and structurally tests that exception (`specs/phase-2-login/PRODUCT.md:281-285`; `specs/phase-2-login/TECH.md:920-936`).
16. CONFIRMED - The bfcache guarantee is honestly relaxed to "does not leave the visitor" authenticated, while explicitly permitting a transient restored frame (`specs/phase-2-login/PRODUCT.md:214-221`; `specs/phase-2-login/TECH.md:971-986,2042-2045`).
17. CONFIRMED - Reload, Back, Forward, guarded redirects, login restoration, success history, and post-logout navigation now have explicit behavior and tests (`specs/phase-2-login/PRODUCT.md:107-111,175-186,214-221`; `specs/phase-2-login/TECH.md:1670-1682,1802-1826,1882-1891`).
18. CONFIRMED - New invariant 97e extends the live proof through the real user-record schema to a non-empty displayed name (`specs/phase-2-login/PRODUCT.md:203`; `specs/phase-2-login/TECH.md:1340-1355,1850-1857`).
19. CONFIRMED - The no-flash test now installs a lifetime `MutationObserver` before navigation and explicitly states what it cannot observe (`specs/phase-2-login/TECH.md:945-962,1790-1801`).
20. CONFIRMED - Independent tabs, opener-created duplicate tabs, and sign-out isolation are now Playwright checks rather than review-only claims (`specs/phase-2-login/TECH.md:1744-1756`).
21. CONFIRMED - The double-submit test now combines exactly one pre-derivation `auth.sign_in_started` event with exactly one transport call (`specs/phase-2-login/TECH.md:1134-1139,1651-1658`).
22. CONFIRMED - Invariant 113's check now starts at login, types and submits entirely by keyboard, verifies the authenticated outcome, and keyboard-activates logout (`specs/phase-2-login/TECH.md:1871-1879`).
23. CONFIRMED - The kit-inventory paragraph now says invariant 87 concerns guard history and assigns the kit changes to invariant 141 (`specs/phase-2-login/TECH.md:1253-1258`).
24. CONFIRMED - TECH now accurately says the existing Button comment names neither Phase 2 nor any caller (`specs/phase-2-login/TECH.md:127-138`).
25. CONFIRMED - VERIFICATION now states 150 kB and names `.size-limit.json` as the authority (`VERIFICATION.md:85-90`; `specs/phase-2-login/TECH.md:2210-2213`).

Edit-pass regressions:

Regression A - `LoginPageDependencies` is said to carry "exactly four things" but declares five properties (`specs/phase-2-login/TECH.md:366-378`).

Regression B - The invariant-105 test map includes Login in the idle-state Tab sequence, contradicting invariant 35, which removes the disabled Login control from the tab order (`specs/phase-2-login/PRODUCT.md:87-93`; `specs/phase-2-login/TECH.md:1897-1900`).

Regression C - Every milestone must finish green, yet M1 constructs `createSignedInUserStore` while M4 delivers its fetch/schema half; no compilable M1 implementation of that factory is specified (`specs/phase-2-login/TECH.md:1372-1375,1384-1394,1461-1475`).

Regression D - The fan-out rationale says all milestones edit the same "four files" but immediately names five, and the milestone lists do not assign all five to every milestone (`specs/phase-2-login/TECH.md:1479-1486`).

23 of 25 are CONFIRMED; the specs are not yet implementable unambiguously as written because findings 10 and 12 remain partial and regressions B-C conflict with the test and milestone plans.
