# G1 Codex fix-confirmation - phase-1-setup

Invocation: codex exec --sandbox read-only resume 019ffa2e-03c5-7c00-852e-e03a02eb97d5 (the SAME thread that raised findings Codex-1..16, per the codex contract's raiser-confirms rule), 2026-08-13.
Brief: re-read both revised specs from disk; mark each original finding RESOLVED / PARTIALLY RESOLVED / NOT RESOLVED with citations; then attack the fixes themselves for new defects.

## Verdict and confirmation (verbatim)

15 unresolved (11 blocking)

1. RESOLVED - `HttpResult` now has explicit `success`, `failure`, and `cancelled` arms, while `HttpFailure` remains the four-member union ([TECH.md:399](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:399)); PRODUCT states the same contract ([PRODUCT.md:53](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:53), [PRODUCT.md:61](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:61)).

2. PARTIALLY RESOLVED - The instantly resolving fake was replaced by a manually advanced queue ([TECH.md:679](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:679)), but the production interface declares `wait(delay, signal)` ([TECH.md:373](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:373)) while the fake declares `sleep(delay)` without a signal ([TECH.md:679](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:679)); it does not implement the stated injected interface.

3. RESOLVED - The cache now has explicit `absent` and no-value `loading` states, with the promise stored before the first `await` and returned to concurrent readers ([TECH.md:437](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:437)).

4. RESOLVED - Loads and revalidations capture a generation and discard writes after `invalidate` or `clear`, while existing waiters still receive their result ([TECH.md:446](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:446); [PRODUCT.md:73](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:73)).

5. RESOLVED - Failed revalidation explicitly leaves both the value and `storedAtMilliseconds` unchanged and uses a separate cooldown field ([TECH.md:445](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:445)).

6. RESOLVED - TECH now assigns reporting to `missingKeyHandler` and the rendered marker to `parseMissingKeyHandler` ([TECH.md:481](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:481)).

7. RESOLVED - Direction now comes from `localeDirection`, backed by an explicit map, rather than `Intl.Locale.getTextInfo()` ([PRODUCT.md:105](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:105), [TECH.md:484](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:484)).

8. RESOLVED - Skeleton dimensions now use a closed token union resolving to static utility classes, emit no `style` attribute, and receive a browser box-equality check ([TECH.md:555](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:555), [TECH.md:887](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:887)). This adequately addresses Tailwind’s build-time scanning provided the implementation uses a literal token-to-class map, as “static utility classes” requires.

9. RESOLVED - `.size-limit.json` now lands in M1 with immediately resolvable entry/vendor and stylesheet globs ([TECH.md:726](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:726), [TECH.md:778](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:778)). A separate M1 problem remains in new finding 23.

10. RESOLVED - `reportRootError` now guards non-object values before touching the `WeakSet` ([TECH.md:632](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:632)). Primitive exactly-once reporting remains defective for a different reason, covered by finding 22.

11. RESOLVED - The `try/catch` now covers level filtering, redaction, and the sink, with a throwing-getter test exercising the pre-sink path ([TECH.md:465](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:465), [TECH.md:865](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:865)).

12. RESOLVED - Every literal Size Limit entry now contains `"running": false` ([TECH.md:730](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:730), [TECH.md:739](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:739)).

13. RESOLVED - The RTL override is now installed through `page.addInitScript` before navigation, and the test checks a computed inline-start effect rather than overflow alone ([TECH.md:877](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:877)).

14. PARTIALLY RESOLVED - The inventory is substantially more candid ([TECH.md:956](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:956)), but its concluding claim that every unlisted invariant has a discriminating check remains false ([TECH.md:979](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:979)); see answer B.

15. RESOLVED - Busy buttons now call `preventDefault()` and skip `onClick`, with click and Enter tests inside a form ([TECH.md:550](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:550), [TECH.md:889](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:889)).

16. NOT RESOLVED - TECH explicitly records that ARCHITECTURE still says “Three layers” while naming four and defers the correction to another edit ([TECH.md:38](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:38)). Documenting the contradiction does not remove it from a binding document.

A. New defects, contradictions, or unproven claims

17. TECH still describes the timeout controller as per attempt, contradicting the fixed logical-request deadline | TECH says “one `AbortController` per attempt, aborted by `clock` after `timeoutMilliseconds`” ([TECH.md:413](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:413)), while PRODUCT requires one deadline covering both attempts and backoff ([PRODUCT.md:51](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:51)); the testing map expects logical-request behavior but the design section still specifies per-attempt timers ([TECH.md:831](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:831)). | BLOCKING

18. The cache cooldown is simultaneously 30 seconds and 10 seconds | PRODUCT fixes it at 30000 ms ([PRODUCT.md:72](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:72)), while TECH’s registry and state-machine prose use 10000 ms ([TECH.md:429](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:429), [TECH.md:445](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:445)). | BLOCKING

19. A global generation counter makes invalidating one key discard unrelated in-flight writes | TECH says every entry captures the cache’s single monotonically increasing counter and `invalidate(key)` increments it ([TECH.md:446](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:446)); invalidating key A therefore makes an unrelated key B’s captured generation stale, even though B was not invalidated. Per-key generations, or a clear-generation plus per-key generations, are needed. | BLOCKING

20. The kit route’s production guard violates the single-environment-reader invariant | TECH makes `environment.ts` the only permitted `import.meta.env` reader ([TECH.md:283](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:283)) but later requires a static `import.meta.env.DEV` guard in the kit-route code ([TECH.md:566](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:566)). | BLOCKING

21. M4’s claimed independence from M3 is false | M4’s kit route is registered through `configuration.developmentRoutes` ([TECH.md:566](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:566)), but configuration is delivered by M3 ([TECH.md:784](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:784)); M4 nevertheless says it depends only on M1 and explicitly not M3 ([TECH.md:789](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:789)). | BLOCKING

22. Primitive errors can now be recorded more than once, contradicting invariant 92 | Boundaries call `reportRootError` ([TECH.md:631](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:631)) and `createRoot.onCaughtError` also routes the same caught error to `reportRootError` ([TECH.md:633](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:633)); object errors dedupe, but primitives deliberately take an un-deduplicated path and may report twice ([TECH.md:632](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:632)), directly contradicting “exactly once” ([PRODUCT.md:139](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:139)). The installed React 19 types and implementation do confirm that both root callbacks exist; the defect is their interaction with the boundary reporter. | BLOCKING

23. M1’s full `verify` still borrows route and catalogue assertions from M5 | `verify:build` says it always runs route and catalogue chunk assertions ([TECH.md:708](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:708)), but those chunks and their Size Limit entries arrive only in M5 ([TECH.md:737](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:737), [TECH.md:791](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:791)); M1 nevertheless claims the whole `verify` chain passes ([TECH.md:779](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:779)). | BLOCKING

24. The invariant 62 testing-map entry retains the vacuous check that the design section explicitly rejects | Section 3.5 says grepping the login route chunk is vacuous and replaces it with a manifest chunk-graph assertion ([TECH.md:480](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:480)), but the testing map still specifies grepping `login-route-*.js` for a hierarchy key ([TECH.md:871](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:871)). | BLOCKING

25. The catalogue size configuration does not enforce the product’s per-catalogue limit | PRODUCT requires each lazy catalogue chunk to be at most 5 kB ([PRODUCT.md:163](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:163)); TECH groups both files under one 10 kB entry ([TECH.md:743](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:743)), allowing one catalogue to exceed 5 kB while the combined check passes. | BLOCKING

26. The 85-90 kB estimate still has two incompatible meanings | Context and PRODUCT say it covers fixed dependencies alone ([TECH.md:42](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:42), [PRODUCT.md:163](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:163)); Size Limit and Risks say it covers the entry-plus-vendor pair including application code ([TECH.md:748](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:748), [TECH.md:983](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:983)). | non-blocking

27. The kit-route definition uses incompatible paths, flags, and invariant numbers | The layout places it at `src/app/kit-route/kit-route.tsx` behind `__KIT_ROUTE__` ([TECH.md:116](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:116)); section 4.4 places it at `src/app/routes/kit-route.tsx` behind `configuration.developmentRoutes` plus `import.meta.env.DEV` and calls the production exclusion invariant “87a” ([TECH.md:561](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:561), [TECH.md:565](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:565)), while PRODUCT defines it as invariant 86b ([PRODUCT.md:130](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:130)). | non-blocking

28. The Risks section prescribes a different boundary model from section 2 | Section 2 defines a `testing-harness` element plus a test-file override ([TECH.md:222](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:222), [TECH.md:253](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:253)); Risks instead says the resolution is an explicit `test` element allowed to import any layer ([TECH.md:989](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:989)). | non-blocking

B. Is the review-dependent inventory honest?

No. It is improved, but these unlisted invariants still lack the claimed discrimination:

- 21 and 58 - PRODUCT itself says computed network access is review-carried ([PRODUCT.md:49](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:49)), yet neither appears in the review-dependent list. An unused computed transport or same-origin sink can evade the enumerated lint rules and never reach a stub.
- 33 - “an exhaustive switch with no default” does not automatically fail TypeScript when a union member is added ([TECH.md:837](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:837)). It needs an `assertNever`, a `never` assignment, or an exhaustiveness-enforcing return contract.
- 55-56 - tests at depths 1, 3, and 6 ([TECH.md:862](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:862)) do not mechanically establish “at any depth”; algorithm inspection remains review-dependent.
- 87 - the implementation and tests consume the same state inventory ([PRODUCT.md:131](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:131)). Omitting one documented state, such as Button busy, from that shared inventory lets both surfaces agree on the same incomplete oracle.
- 90 - provider availability plus a grep for one `createBrowserRouter` occurrence ([TECH.md:902](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:902)) does not prove the whole provider stack is composed in exactly one place.
- 115 - section 2 says a real-promise-chain residue is review-dependent ([TECH.md:312](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:312)), but invariant 115 is absent from the final list. A test can also instantiate the permitted real clock rather than inject the fake.

Finding 14 therefore remains blocking.

C. Are PRODUCT and TECH mutually consistent?

No. They are now consistent on the three user-decided choices at the invariant level:

- Development-only `/__kit`: [PRODUCT.md:129](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:129).
- Cancellation as a sibling result arm: [PRODUCT.md:53](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:53), [TECH.md:399](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:399).
- Logical-request deadline: [PRODUCT.md:51](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:51), [TECH.md:831](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:831).

However, findings 17-28 leave contradictions across the detailed design, testing map, milestones, and risks. The observability factory change itself is consistent: PRODUCT distinguishes the three-key facade from the factory’s separate buffer handle ([PRODUCT.md:79](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:79), [PRODUCT.md:80](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:80)), and TECH tests that exact distinction ([TECH.md:453](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:453), [TECH.md:853](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:853)).

No files were modified.
