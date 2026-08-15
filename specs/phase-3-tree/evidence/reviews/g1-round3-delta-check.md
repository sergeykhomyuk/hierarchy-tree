# G1 - round-3 delta check (verbatim, substantive excerpt)

A fresh `agentic-loop:loop-spec-validator` checking only the round-3 changes, weighted toward
the interaction-tracker change - the one piece that was the orchestrator's own reasoning
rather than a reviewer's prescription.

**Significance: this is the first round that found no new design defect.** Item 2 - the core
`shouldRevalidate` correction - is verified correct end to end, and item 1's central reasoning
is confirmed on both the failure and the fix. What remains are consistency defects between the
two documents.

---

**Verdict: 1 of 4 correct, 3 with problems**

**Item 1 (interaction tracker) - PROBLEM (core reasoning validated, two gaps).**
(a) The failure is real and the citations are exact. `revalidate()` calls `interruptActiveLoads()` (which only sets `isRevalidationRequired`, publishes nothing - `router.js:1090-1096`) then `updateState({revalidation:"loading"})` at `router.js:476`, and because `state.navigation.state === "idle"` it calls `startNavigation(..., {startUninterruptedRevalidation:true})` (`:479-481`), which makes `shouldUpdateNavigationState` false at `:655` so `navigation` never leaves idle for the whole revalidation. With `beginInteraction()` called just before, `createInteractionTracker.ts:71-73` sees `!isNavigating && tracking` and calls `settle()` → a spurious `app.route_viewed`. Confirmed.
(b) The rule does not break the normal settle path, and I checked the two paths that could have been broken: the **initial load** (`:277` hydration → `shouldUpdateNavigationState` false at `:655`, so the first `route_viewed` comes from the completion update where `revalidation` is idle→idle, i.e. *not* revalidation-only → still settles), and a **genuine navigation** (completion at `:376-392` moves `navigation` loading→idle, so it is never "revalidation-only" → still settles). Both survive.
(c) There IS a case the spec does not address: an overlapping genuine navigation now inherits the retry's interaction. Concretely - error state → click **Retry** (slow request) → click **Back to login** (invariants 70/73): pre-change the spurious `settle()` had already cleared `tracking`, so `/login` minted a fresh id; post-change `tracking` is still true when `handleLoaders` publishes `navigation:"loading"` (`:705-713`), so `createInteractionTracker.ts:67-70` skips `startInteraction()` and the login navigation, its log lines and its `route_viewed` all carry the retry's correlation id. This is exactly the hazard `endInteraction`'s own comment (`createInteractionTracker.ts:24-30`) was written for, and TECH's Retry paragraph never mentions it. Non-blocking, but it should be named.
(d) Yes - a retry now emits **no** `route_viewed` at all: the revalidation's completion update (`:376-392`) moves `revalidation` loading→idle while `navigation` stays idle, so it is ignored too, and `endInteraction()` only flips `tracking`, it does not emit. That is consistent with PRODUCT 190 but PRODUCT never states the *positive* expectation, and no test pins it. Worse, "ignore a state change that **only** moves `revalidation`" is genuinely ambiguous: the completion update also moves `loaderData`, `location`, `matches` and `historyAction`, so an implementer comparing more than `navigation.state`+`revalidation` will legitimately let it settle and emit one `route_viewed` per retry. Two conforming implementations, two different buffers, and TECH also never says `RouterState` (`createInteractionTracker.ts:4-8`) must grow a `revalidation` field.

**Item 2 (`shouldRevalidate` on both routes) - CORRECT.** Verified end to end against `router.js` and `routeDefinitions.ts`. Both routes are `lazy` but `lazy` is cleared to `void 0` after first resolution (`router.js:2185-2188`), so on a later toggle the `route.lazy` force at `:1953` does not fire; `loaderData` holds both ids so `isNewLoader` at `:1958` does not fire either; the predicate is therefore consulted, returns `false` for both, and `handleLoaders` takes the no-loader short-circuit at `:693` (satisfied: no `init.dataStrategy` - `createApplicationRouter.ts:10-12` passes only `basename` - no middleware, no fetchers). The short-circuit returns *before* `:705`, so `navigation` never becomes `loading`, the tracker opens no interaction and emits no `route_viewed`: invariant 161 is true. The bfcache guard survives: `createBackForwardRestore.ts:18` revalidates with identical URLs → empty difference set → predicate returns `defaultShouldRevalidate`, which `interruptActiveLoads` has forced to `true` via `isRevalidationRequired` (`:1963`), so `requireSession` re-runs. Two things the earlier check did not raise, both of which come out right: the `authenticated` loader's `signedInUser` promise is *preserved by identity* across a toggle (`mergeLoaderData` keeps the old entry because the route has a loader - `:2706-2710`), so the header does not re-suspend; and a both-parameters-change navigation falls back to `defaultShouldRevalidate` = refetch, which is only reachable by hand-crafting a URL, never by a toggle (127 preserves other params), so invariant 124 is not falsified in practice.

**Item 3 (cancellation reach) - PROBLEM.** The mechanics are accurate: the loader returns synchronously, `handleLoaders` resolves, `pendingNavigationController = null` at `router.js:559` *before* `completeNavigation`, so `:490`'s abort on the next navigation finds nothing; `cancelled` is reachable in a unit test via a pre-aborted signal (`createHttpClient.ts:71-73` returns `{outcome:'cancelled'}` before any transport call). TECH §4's "holds no previous result" now agrees with PRODUCT 57. But TECH contradicts itself one section later: §2 says "no milestone boundary claims otherwise" (TECH.md:163-165), while M2's boundary still lists "…all-rows-invalid, **and an aborted navigation**" among the e2e shapes (TECH.md:342-343). That e2e case cannot be written as described.

**Item 4 (smaller round-3 edits) - PROBLEM (3 of the listed edits landed in only one of the two documents).**
- HTTP client removed from the page's deps: present in TECH.md:248-250, but PRODUCT invariant 193 still names "the HTTP client" among what the feature receives from the route. TECH never says how `fetchPeople` gets an `HttpClient`.
- `useRevalidator` in the feature layer's restricted imports: TECH.md:222-225, mechanism exists (`eslint.config.js:578-591`). Note the file's own warning at `:599-603`: the `src/features/auth/guard/**` block *replaces* rather than merges, so it must repeat the new entry or the ban silently drops for that directory.
- **Invariant 64 moved out of jsdom: only half-done, and it is the blocking half.** PRODUCT.md:225-226 says "a real browser, not jsdom", but TECH.md:390-397 still lists the bounding-box check for 64 under "**Component (jsdom + Testing Library + axe)**". As written TECH prescribes precisely the vacuous test PRODUCT now forbids. (The sibling "`scrollTop` before/after for 113" has the same defect.)
- 185's split: correct now. Two mockup deviations + six architecture/phase-1 deviations = eight, agreeing with 182.
- 97's reset: present (PRODUCT.md:330-332), but TECH adds no mechanism and no test - the component-test list covers only the remount half. With `use()` + Suspense the page is not remounted across a revalidation, so the reset must be written against the resolved payload's identity.
- 190 extended: all four additions present. Stale counts left behind: TECH.md:178-180 still calls the runtime clock "a **third** app-layer surface", and risk 3 still says "**Eight** shared-surface changes".
- Milestones: 142→M4 alone ✓, 161's toggle assertion→M3 ✓, `e2e:deployed`→M5 ✓. **The home-route rewrite did not land in M2's deliverables** and contradicts M2's own "with the page still rendering phase 1's placeholder" boundary, since the rewritten HomeRoute renders `HierarchyPage`. The tracker change and the retry wrapper consequently have no milestone home at all.

**Blocking problems**
1. TECH keeps invariant 64's bounding-box check in the jsdom suite, contradicting PRODUCT and leaving 64 with no valid verification anywhere.
2. The HomeRoute rewrite cannot be M2's deliverable while M2's boundary requires the phase-1 placeholder. Split it, and give the tracker change and the wrapper an explicit milestone.
3. M2's boundary still lists "an aborted navigation" as an e2e case, which TECH itself proves cannot be produced through Playwright.

**Remaining contradictions**
- PRODUCT never states the expected `route_viewed` count for a retry, and the tracker rule admits two implementations that differ on exactly that.
- PRODUCT 193 names the HTTP client among what the feature receives; TECH says the page never gets it.
- PRODUCT 57 narrates "when react-router aborts a loader because a newer navigation superseded it", which TECH now proves never happens here.
- Invariant 98's only verification is `e2e:deployed`, whose project runs `deployed-smoke.spec.ts` alone - a spec that today never signs in, while `/` is guarded. Observing the mixed-content fallback on the deployed origin requires authenticating against the real public database with a real plaintext password, which no spec section provides for and which sits uncomfortably next to invariant 51's "no fixture, mock or evidence file in this repository contains one". Non-blocking, but it is a decision the user was never asked.
- Stale counts: "a third app-layer surface" and "Eight shared-surface changes" no longer match the enumerated list.

---

**Disposition:** all three blocking problems and every listed contradiction except the
invariant-98 credential question were fixed in round 4; that one was put to the user.
