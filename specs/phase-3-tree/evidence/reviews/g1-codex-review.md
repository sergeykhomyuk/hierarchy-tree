# G1 - Codex second opinion (verbatim)

Fresh Codex thread, read-only spec review of `PRODUCT.md` + `TECH.md`, run 2026-08-15.
Codex session id `01a004b7-0c27-7392-a6de-85123cd8b4a0` (`codex resume 01a004b7-0c27-7392-a6de-85123cd8b4a0`).
Findings recorded in loop state as `Codex-1` .. `Codex-17` with `--gate G1`.

---

17 findings (7 blocking).

1. Updating `expanded` with `useSearchParams` causes a navigation and, by default, revalidates route loaders, so every toggle will fetch `/users.json` again unless the route defines `shouldRevalidate` for expansion-only changes. | `PRODUCT.md:282-305`; `TECH.md:172-174`; `src/app/routing/routeDefinitions.ts:15-24` | This directly violates invariants 103 and 155 and can replace the current loader promise on every mouse or keyboard toggle. React Router documents that search-parameter changes revalidate loaders. | BLOCKING

2. The guarantee that password values "never exist as a value anywhere in application memory" cannot be met by the proposed boundary. | `PRODUCT.md:128-130,414-416`; `TECH.md:115-121`; `src/platform/http/performAttempt.ts:50-55` | `response.json()` necessarily materializes the complete raw records, including `password`, before Zod strips unknown fields. Invariant 159's weaker "not kept past parsing" is feasible; invariant 43 is not. | BLOCKING

3. The "only users read/no other origin" rules contradict the required third-party photo loads. | `PRODUCT.md:48-49,402-411` | Invariants 4 and 155 say there is no request except the users read and no contacted origin except Firebase; invariants 156-157 require browser requests to arbitrary HTTPS image origins. Tests cannot know which requirement is authoritative. | BLOCKING

4. The quality gate currently rejects the exact domain names and ARIA markup TECH proposes. | `TECH.md:214-217,226-230`; `scripts/assert-domain-vocabulary.mjs:28-34,138-165`; `scripts/guard-scripts.test.ts:31-60`; `package.json:13,21` | M1 fails as soon as `buildForest` or `flattenVisible` lands, and M3 fails on literal `role="tree"`. TECH schedules no removal or phase-3 narrowing of these phase-1 tripwires or their tests, so the stated `npm run verify` boundaries are unreachable. | BLOCKING

5. Retry does not currently obtain the required new correlation id. | `PRODUCT.md:186-192`; `TECH.md:144-147`; sibling phase-2 `src/app/routing/createInteractionTracker.ts:63-74,87-93` | `useRevalidator().revalidate()` uses the router's separate revalidation lifecycle, while the tracker mints ids from `navigation.state`. TECH must explicitly call `beginInteraction()` before retry or extend tracker wiring; merely reading `currentCorrelationId()` repeats the prior id. | BLOCKING

6. Invariant 94 requires a person's name to be formatted "through Intl", but ECMA-402 has no person-name formatter and TECH names no implementable substitute. | `PRODUCT.md:260-261`; `ARCHITECTURE.md:104-108`; `TECH.md:154-180` | `Intl.ListFormat` formats lists, not culturally ordered person names. The spec must choose catalogue interpolation, a documented display-name rule, or another concrete formatter. The current requirement cannot be implemented faithfully. [ECMA-402's current constructor list](https://tc39.es/ecma402/) contains no person-name service. | BLOCKING

7. The milestone allocation is not independently verifiable as claimed. | `TECH.md:206-242`; `PRODUCT.md:186-189,286-318,341-342` | M3 owns invariant 66, which requires URL expansion preservation supplied only by M4, and invariants 105-106 include keyboard toggles supplied only by M5. M4 owns invariant 113/117 behavior for keyboard toggles, also supplied only by M5. | BLOCKING

8. Photo-failure telemetry has no named integration seam while TECH also says the existing `Avatar` is consumed unchanged. | `PRODUCT.md:249-251,391-394,460-462`; `TECH.md:52-54,167-171`; `src/shared/ui/Avatar.tsx:4-9,21-40` | `Avatar` handles its error internally and accepts no failure callback. A parent error-capture wrapper or a kit API change is needed to prove exactly-once reporting per row; TECH specifies neither. | non-blocking

9. TECH does not define the branded email type required at the boundary. | `PRODUCT.md:138-139`; `TECH.md:87-91,113-121` | It names `PersonIdentifier` but leaves `Person.email` as an unspecified field. A compile-time test cannot prove that raw strings are rejected until a concrete `EmailAddress` brand and schema transform are specified. | non-blocking

10. Type-ahead matching is not deterministic enough to write the promised key-by-key tests. | `PRODUCT.md:336-338`; `TECH.md:175-178,293-295` | The spec does not define case/locale sensitivity, whether matching uses trimmed full name or accessible fallback email, treatment of punctuation, or how a multi-character buffer interacts with repeated-character cycling. | non-blocking

11. The `*` bulk expansion lacks URL, history, announcement, and telemetry cardinality rules. | `PRODUCT.md:288-289,304-305,339-342` | Expanding several siblings could mean one history entry and one aggregate announcement/event, or one of each per branch. Invariant 129's "same path as the mouse" does not settle this. | non-blocking

12. TECH fails to report the existing avatar-accessibility deviation from ARCHITECTURE. | `ARCHITECTURE.md:98-102`; `PRODUCT.md:258-259`; `TECH.md:181-191` | ARCHITECTURE requires avatars to carry meaningful alternatives; PRODUCT deliberately makes the image decorative because the row supplies the name. TECH claims the flat tree is the one architectural deviation, which is false. | non-blocking

13. The anomaly invariants point to the wrong reporting rule. | `PRODUCT.md:58-60,71-73,265-267,387-389` | Invariants 8 and 13 cite invariant 96, which governs row wrapping. They should cite invariant 149. | non-blocking

14. The test strategy claims whole ranges without naming discriminating checks for several behavioral guarantees. | `TECH.md:249-279` | "Component invariants 53-106" does not establish layout shift, unrelated-row render isolation, scroll retention, no rebuild/refetch, referrer behavior, exactly-once photo telemetry, or all-width single-line layout. | non-blocking

15. The proposed signed-in-id seam assumes a `number`, while phase 2 deliberately permits branded string or numeric identifiers. | `TECH.md:139-149`; sibling phase-2 `src/features/auth/domain/userIdentifier.ts:1-25`; `lookupResultSchema.ts:9-13` | Passing phase 2's `UserIdentifier` as a plain `number` does not type-check without narrowing. TECH should define string-id behavior - normally "no matching row, therefore no marker" - and the conversion. | non-blocking

16. Collapsed manager-count wording is ambiguous. | `PRODUCT.md:77-79,262-264`; `TECH.md:102-105` | "2 hidden" could mean two direct reports or every hidden descendant, while the row model carries only direct `reportCount`. A deep subtree produces different visible copy depending on the interpretation. | non-blocking

17. The `expanded` grammar is insufficiently specified. | `PRODUCT.md:293-303`; `TECH.md:108-111` | Comma separation is named, but whitespace, empty segments, signs, decimals, exponent notation, unsafe integers, multiple `expanded` parameters, and mixed valid/invalid entries have no prescribed result. | non-blocking

## Completeness

Invalid. The pure forest rules are otherwise unusually thorough: payload ordering, duplicates, dangling managers, self-links, deterministic cycle breaking, mutation, termination, and flattening metadata are all covered. The main missing decisions are:

- Whether manager/report counts are derived strictly from retained forest children.
- Whether collapsed "hidden" means direct children or the complete hidden subtree.
- Exact anomaly-count semantics - cycles broken versus people participating.
- The branded email design.
- The complete `expanded` grammar.
- Deterministic type-ahead and `*` bulk-action semantics.
- Focus recovery when Back/Forward or refreshed data removes the focused row.

## Internal consistency

Invalid. The material contradictions are:

- Password never entering memory versus the existing whole-payload JSON parse.
- No requests/other origins versus third-party photo requests.
- M3/M4 invariant ownership versus later URL and keyboard work.
- PRODUCT's decorative images versus ARCHITECTURE's meaningful avatar alternatives.
- Invariants 8/13 pointing to invariant 96.
- TECH's "one architectural deviation" claim overlooking the avatar alternative change.

The flat `treeitem` structure is the reported deviation and is technically feasible when explicit `aria-level`, `aria-posinset`, and `aria-setsize` are present.

## Feasibility

The basic architecture is feasible after the blockers are corrected:

- `src/platform/http` supports a synchronous parser, typed failures, cancellation, timeout and retry.
- `routeDefinitions.ts` supports adding an index loader through the lazy route.
- `createRuntime.ts` already exposes `http`, observability and the interaction tracker.
- The boundary policy permits `app -> feature` and `feature -> shared/platform`; it forbids only cross-feature imports as TECH expects.
- Vitest includes hierarchy domain/component tests and enforces 100% domain coverage.
- Playwright supports deterministic route mocking against the built artifact.
- CSP is centrally generated where TECH says it is.

React Router assumptions:

- Returning an object containing a promise is correct and allows Suspense/React `use()`; returning the bare promise would block. [Official streaming documentation](https://reactrouter.com/how-to/suspense).
- `setSearchParams` performs a navigation, and absent `{ replace: true }` the navigation pushes history, so the push assumption is sound. [Official `useSearchParams` documentation](https://reactrouter.com/api/hooks/useSearchParams).
- The missing consequence is that search-parameter navigation revalidates loaders by default. A `shouldRevalidate` rule is required.
- `useRevalidator` does rerun loaders and exposes its own `idle/loading` state. It is suitable for Retry, but it does not itself mint the new interaction correlation id. [Official `useRevalidator` documentation](https://reactrouter.com/api/hooks/useRevalidator).

## Testability

Invariant 43 is not testable or satisfiable as written: a test cannot prove that a value never existed in JavaScript memory when `response.json()` produced it.

The following need explicit tests beyond TECH's broad range assignments:

- 23: instrument operations over adversarial sizes and assert a linear upper bound; timing alone is too noisy.
- 39/103/155: count intercepted users requests before and after toggles, Back/Forward and retry; separately allow intended image requests after resolving the contradiction.
- 59: observe `layout-shift` entries or compare stable frame/header/nav bounding boxes before and after resolution.
- 84: use row render spies or React Profiler commits and assert unrelated row ids did not render.
- 89/151: fire repeated image errors and rerenders, then assert one sanitized event per failed row.
- 91: inspect the intercepted image request and assert no `Referer`.
- 96: assert `white-space`, overflow and ellipsis at representative widths/depths, including 320px and the exact breakpoint boundaries.
- 104: record the scroll container's `scrollTop` before and after a toggle.
- 116/118: open the copied URL in a fresh browser context with empty storage and assert identical expansion and no expansion-related storage writes.
- 152/159: inspect every emitted record and fixture for prohibited fields/values; this can prove non-retention and non-reporting, not "never existed".
- 160: inspect the built chunk graph and assert the login route does not import hierarchy code/catalogue.
- 164: define a numeric interaction threshold, then collect a browser performance trace; the current wording has no objective pass value in PRODUCT.
- 165: use approved screenshot baselines and a documented visual-diff tolerance.
- 169-172: repository tests can assert README sections, decision entries and roadmap state; TECH currently leaves these to reading.
- 173: run the complete phase-2 regression suite and its authentication e2e flows.
- 180: this remains primarily a code-review judgment; an AST/import test can catch known prohibited modules but cannot prove the absence of every speculative abstraction.

## Milestones

No - the six milestones are not six independently verifiable behavioral boundaries.

M2 specifically can be verified while the placeholder remains: a lazy index route may register the loader, intercepted requests prove the fetch, and buffer events distinguish data/empty/failure/drop outcomes without rendered tree UI. The object-containing-promise pattern also permits the placeholder to render immediately.

The dependency failures are later:

- M3 claims all invariants 53-106, but invariant 66 requires M4 URL state, while 105-106 include M5 keyboard toggles.
- M4 claims 107-119, but invariant 113's keyboard half requires M5.
- M1 and M3 also cannot pass their own `npm run verify` boundaries until their same-milestone guard-script updates are added.

No tests were run: this was a read-only inspection, and the phase-3 worktree has no `node_modules`. The worktree is on `loop/feature/phase-3-tree` at `6511fb1`, with `specs/phase-3-tree/` currently untracked; phase-2 claims were checked in the sibling `loop/feature/phase-2-login` worktree.
