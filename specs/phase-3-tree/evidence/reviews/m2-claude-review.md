# M2 boundary review (Claude, fresh context)

Reviewer: `agentic-loop:loop-reviewer` subagent, spawned on the M2 diff
(`git diff cfc3da2..HEAD`, excluding `specs/phase-3-tree/evidence/logs/`,
`specs/phase-3-tree/evidence/milestones/` and `specs/phase-3-tree/loop.json`).

## Verdict

3 findings (0 blocking)

## Findings

1. **`shouldRevalidateExpansionOnly` only compares the first value of a repeated
   search-parameter key, so a difference confined to a later occurrence of a
   multi-valued key goes undetected.**
   `src/app/routing/shouldRevalidateExpansionOnly.ts`

   The function builds `parameterNames` from `.keys()` (deduped by `Set`) but
   compares values with `.get(name)`, which returns only the first occurrence.
   For a hypothetical URL `?tag=a&tag=b` → `?tag=a&tag=c`, `.get('tag')`
   returns `'a'` on both sides, so the change is invisible and the parameter
   is treated as unchanged. Today this is not exploitable: the app's only
   search parameter (`expanded`) is written as a single comma-joined value by
   `formatExpansion`/`parseExpansion`, never as a repeated key, and no other
   parameter exists yet. It is a latent correctness gap in a function written
   as a general "any query-parameter" comparator, not one scoped to
   `expanded` alone. Non-blocking.

2. **The `currentCorrelationId() ?? beginInteraction()` fallback in
   `createHierarchyLoader` is never exercised by any test.**
   `src/app/routing/createHierarchyLoader.ts`;
   tests at `src/app/routing/createHierarchyLoader.test.ts`

   Both tests construct the spy interaction tracker with a non-null
   correlation id, so the `?? beginInteraction()` branch is dead code as far
   as the test suite is concerned. Tracing by hand, the design appears sound:
   `beginInteraction()` mutates the tracker's shared `correlationId` state
   before `fetchPeople` calls `http.request`, so the id passed explicitly
   into `fetchPeople` and the id the shared `HttpClient` independently
   derives via `interactionTracker.currentCorrelationId()` do coincide. But
   this coherence claim - the entire point of choosing this fallback over a
   randomness-based one - is asserted only by prose comments, not by a test.
   Non-blocking, but exactly the kind of claim "test honesty" is meant to
   catch.

3. **`reportAnomalies`'s hardcoded kind list is not type-checked for
   exhaustiveness against `ForestAnomalies`.**
   `src/features/hierarchy/data/fetchPeople.ts`

   `ForestAnomalies` has five fields; the `kinds` array in `reportAnomalies`
   lists four (`skippedExpansionSegment` is correctly omitted, since
   `buildForest` always sets it to `0` from this call path). The array's type
   is `readonly (keyof ForestAnomalies)[]`, which does not force the literal
   to cover every key - TypeScript will not flag it if `ForestAnomalies`
   later gains a sixth field with a nonzero value reachable from
   `buildForest`. This undercuts the comment's own stated intent ("so a shape
   change in the shared database is visible rather than silently absorbed").
   Non-blocking today; worth tightening before a sixth anomaly kind is ever
   added.

## Answers to the review questions

- **shouldRevalidateExpansionOnly non-empty-set edge case:** correct and
  load-bearing exactly as documented - the explicit `length > 0 &&` guard is
  what prevents an identical-URL `router.revalidate()` from being misread as
  "expansion-only." The one real gap is the multi-valued-key case (finding 1),
  latent given how `expanded` is actually encoded.
- **Interaction-tracker revalidation-ignore swallowing a real settle:** no
  live concern found. The skip only fires when `!navigationStateChanged &&
  revalidationStateChanged`; any genuine navigation always flips
  `navigation.state` on both the opening and closing transition, so the skip
  branch never applies to it. Corroborated by
  `evidence/milestones/m2-e2e.txt`'s telemetry-buffer test still asserting
  exactly one `route_viewed` for the initial load.
- **fetchPeople telemetry ordering/gating:** correct. `allRowsInvalid`
  short-circuits before `buildForest` and emits only `hierarchy.load_failed`;
  the genuine `Empty` case emits one zero-count `hierarchy.viewed` with no
  drop/anomaly logs; the `Data` path logs drops, then per-kind anomalies,
  then exactly one `hierarchy.viewed`, with no double-counting between the
  schema-level `dropped` count and `buildForest`'s own anomaly counts.
  Cancellation emits nothing.
- **AnalyticsPayloads declaration-merging soundness:** genuinely sound.
  `observabilityFacade.ts` imports `AnalyticsPayloads` from the same file the
  `@platform/observability/analyticsEvents` alias resolves to, so the
  augmentation targets the module TypeScript actually uses; `fetchPeople.ts`
  imports the augmentation file for its side effect, guaranteeing it's part
  of the compiled graph; the vocabulary-tripwire test confirms the platform
  source file itself never contains hierarchy-specific literals.
- **e2e test edits - honest or hiding a regression:** honest. Both edits are
  corroborated by a full green e2e run (41/41), and the count deltas are
  internally consistent with the stated design (header.spec.ts 1→2 on first
  load, 2→3 on bfcache restore; login.spec.ts 1→2).
- **TypeScript discipline / layer boundaries:** no `any`, no banned casts
  beyond the two pre-existing brand-widening ones in the M1 domain
  constructors, no `enum`. `createHierarchyLoader.ts` imports only from the
  `@features/hierarchy` public barrel. Neither `fetchPeople.ts` nor the
  hierarchy feature imports from `@features/auth`; the app-layer
  `createAuthenticatedLoader.ts` importing `requireSession` from
  `@features/auth`'s barrel is the correct direction.
