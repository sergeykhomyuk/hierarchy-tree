# G1 Codex round-4 confirmation - phase-1-setup

Invocation: codex exec --sandbox read-only resume 019ffa2e-... (raiser thread), 2026-08-13, web search DISABLED.
Round 3 of this thread stalled in a web-search retry loop and was terminated with no verdict
(evidence/reviews/g1-codex-round3-incomplete.md); this pass forbade the network and completed cleanly.
Scope: confirm findings Codex-17..28 and the fixes made for the Claude-side round-2 findings.

Verdict: 3 unresolved (2 blocking). 11 of 12 confirmed RESOLVED with citations.
All three were fixed after this pass: 26 (Risks entry still carried the rejected budget reading),
43 (reportRootError's two-argument signature could not reach the interaction-scoped primitive Set),
44 (expected-build-output table's responsibility for non-chunk assertions was contradictory).

## Verdict and per-finding confirmation (verbatim)

3 unresolved (2 blocking)

17. RESOLVED - TECH §3.2 specifies “ONE deadline per logical request” with one controller and timer covering attempts and backoff ([TECH.md:416](/hierarchy-tree/specs/phase-1-setup/TECH.md:416)).

18. RESOLVED - The registry and failed-revalidation behavior consistently use `30_000` ms, and the state machine now includes the `cooling` state ([TECH.md:434](/hierarchy-tree/specs/phase-1-setup/TECH.md:434), [TECH.md:446](/hierarchy-tree/specs/phase-1-setup/TECH.md:446), [TECH.md:449](/hierarchy-tree/specs/phase-1-setup/TECH.md:449)). The enumeration now covers absent, loading, fresh, stale, cooling, and revalidating.

19. RESOLVED - TECH now uses per-key generations plus a cache-wide epoch and explicitly tests that invalidating `a` leaves `b`’s write intact ([TECH.md:450](/hierarchy-tree/specs/phase-1-setup/TECH.md:450)).

20. RESOLVED - `isDevelopmentBuild` is exported by the sole environment reader, while the production-output test catches failure to eliminate the kit module ([TECH.md:364](/hierarchy-tree/specs/phase-1-setup/TECH.md:364), [TECH.md:572](/hierarchy-tree/specs/phase-1-setup/TECH.md:572)).

21. RESOLVED - M4 now explicitly depends on M3 and defers its browser checks until M5 ([TECH.md:794](/hierarchy-tree/specs/phase-1-setup/TECH.md:794), [TECH.md:804](/hierarchy-tree/specs/phase-1-setup/TECH.md:804)).

22. RESOLVED - Primitive values are now deduplicated by an interaction-scoped `Set`, cleared when the next interaction begins ([TECH.md:638](/hierarchy-tree/specs/phase-1-setup/TECH.md:638)). Its integration remains underspecified; see finding 43.

23. RESOLVED - `expected-chunks.json` is empty in M1 and populated only when M5 creates the route and catalogue chunks ([TECH.md:714](/hierarchy-tree/specs/phase-1-setup/TECH.md:714)). A separate activation contradiction remains; see finding 44.

24. RESOLVED - Invariant 62 now tests the Vite manifest’s transitive chunk graph instead of grepping a route chunk that contains no catalogue text ([TECH.md:484](/hierarchy-tree/specs/phase-1-setup/TECH.md:484), [TECH.md:880](/hierarchy-tree/specs/phase-1-setup/TECH.md:880)).

25. RESOLVED - M5 adds separate 5 kB entries for the auth and hierarchy catalogue chunks ([TECH.md:743](/hierarchy-tree/specs/phase-1-setup/TECH.md:743)).

26. NOT RESOLVED - PRODUCT and TECH §7.3 say the 85–90 kB estimate covers the “fixed runtime dependency set alone” ([PRODUCT.md:163](/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:163), [TECH.md:755](/hierarchy-tree/specs/phase-1-setup/TECH.md:755)), but Risks still says it estimates “the entry plus vendor pair” ([TECH.md:992](/hierarchy-tree/specs/phase-1-setup/TECH.md:992)).

27. RESOLVED - PRODUCT consistently names `/__kit`; TECH consistently uses `src/app/kit-route/kit-route.tsx`, nested path `__kit`, `isDevelopmentBuild`, `configuration.developmentRoutes`, and invariants 86/86a/86b/87 ([PRODUCT.md:129](/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:129), [TECH.md:565](/hierarchy-tree/specs/phase-1-setup/TECH.md:565)).

28. RESOLVED - Risks now repeats section 2’s `testing-harness` element and narrowly scoped test-file override instead of prescribing another boundary model ([TECH.md:253](/hierarchy-tree/specs/phase-1-setup/TECH.md:253), [TECH.md:998](/hierarchy-tree/specs/phase-1-setup/TECH.md:998)).

The other requested fixes are internally coherent: typed cache namespaces ([TECH.md:438](/hierarchy-tree/specs/phase-1-setup/TECH.md:438)); level checking inside guarded `dispatch` ([TECH.md:466](/hierarchy-tree/specs/phase-1-setup/TECH.md:466)); instance-owned interaction state and `tracker.attach(router)` ([TECH.md:473](/hierarchy-tree/specs/phase-1-setup/TECH.md:473)); root recovery through `configuration.basePath` ([TECH.md:635](/hierarchy-tree/specs/phase-1-setup/TECH.md:635)); identical development/production base paths ([TECH.md:603](/hierarchy-tree/specs/phase-1-setup/TECH.md:603)); exported literal `sizeClass` mappings ([TECH.md:559](/hierarchy-tree/specs/phase-1-setup/TECH.md:559)); and the forced-error exact-set assertion ([PRODUCT.md:148](/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:148), [TECH.md:912](/hierarchy-tree/specs/phase-1-setup/TECH.md:912)). React Router’s additional console behavior and Playwright’s project-specific `webServer` support are UNVERIFIED (not installed).

New findings

43. Primitive deduplication is assigned to the tracker, but the specified reporting API cannot access that tracker | Invariant 92 / TECH §5.4 | `reportRootError(error, observability)` is specified with only two arguments, while the new primitive `Set` lives on the interaction-tracker instance; implementing the written signature requires hidden global state, dropping primitive deduplication, or changing the API ([TECH.md:637](/hierarchy-tree/specs/phase-1-setup/TECH.md:637), [TECH.md:638](/hierarchy-tree/specs/phase-1-setup/TECH.md:638)) | BLOCKING

44. `expected-chunks.json` has contradictory responsibility for non-chunk build assertions | TECH §7.1 / M1–M5 | Section 7.1 says the table drives route/catalogue chunk assertions only, but M5 says populating it activates the 404-copy and kit-absence assertions too; therefore an implementer cannot tell whether M1’s full `verify:build` must run the 404 test before M5 creates `404.html` ([TECH.md:714](/hierarchy-tree/specs/phase-1-setup/TECH.md:714), [TECH.md:798](/hierarchy-tree/specs/phase-1-setup/TECH.md:798)) | BLOCKING

No - the specification still requires reviewer intervention to settle findings 43 and 44.
