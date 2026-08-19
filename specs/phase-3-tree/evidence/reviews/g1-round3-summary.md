# G1 - round 3: what the delta check changed

Companion to `g1-confirmation-summary.md`, kept separate because that file is registered
evidence and immutable once referenced. Full record: `g1-round2-delta-check.md`.

## Round 3 - focused delta check of the round-2 changes

A fresh validator checked only the round-2 deltas (record:
`g1-round2-delta-check.md`). Verdict: **2 of 9 correct, 7 with problems**, three blocking -
and the most important one was that round 2's own fix over-corrected.

The root cause: scoping `shouldRevalidate` to the index route alone was justified by a fear
the corrected rule had already eliminated. A bfcache revalidation has identical URLs, so the
non-empty-difference clause returns `defaultShouldRevalidate` regardless of which routes carry
the predicate - the guard was never at risk once the clause was there. Meanwhile, leaving the
`authenticated` route revalidating meant a toggle still had a loader to run, so react-router
never took its no-loader short-circuit, the navigation entered its loading state, and the
interaction tracker opened an interaction and emitted a route-viewed event per toggle -
falsifying the invariant round 2 had just rewritten to say the opposite.

Round-3 changes: the predicate covers both routes; the tracker learns to ignore a
revalidation-only state change, without which every Retry emits a spurious route-viewed and
closes its interaction before the request starts; cancellation's reach is stated honestly (the
object-holding-a-promise loader resolves synchronously, so `router.js:559` clears the pending
controller without aborting, and `cancelled` is reachable in a unit test but not through a
superseded navigation); the HTTP client leaves the page's dependency list, since the loader
owns fetching; `useRevalidator` is added to the feature layer's restricted imports so the
"unbypassable" claim is enforced rather than asserted; the layout-shift assertion is moved out
of jsdom, where every rect is zero and it would have passed without measuring; the mockup-
deviation split is corrected from three to two; invariant 161's toggle assertion moves to M3,
`e2e:deployed` becomes M5's boundary for the mixed-content block, and the home-route rewrite
becomes an M2 deliverable.
