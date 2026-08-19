# G1 - raiser confirmation round (summary of both passes)

After the 44 findings were resolved by rewriting PRODUCT.md and TECH.md, each raiser
re-checked its own findings against the revised text: a FRESH `agentic-loop:loop-spec-validator`
instance on the Claude side (that role has no thread continuity, so confirmation is by
independent re-check, which is the point), and the ORIGINAL Codex thread
`01a004b7-0c27-7392-a6de-85123cd8b4a0` on the Codex side.

## Outcomes

- **Claude: 25 of 27 resolved, 0 not resolved, 2 partial** (23 route-viewed premise, 26
  invariant 194 double-assigned), plus 10 newly-introduced problems, one blocking.
- **Codex: 14 of 17 resolved, 1 not resolved (7, milestone forward dependencies), 2 partial**
  (5 retry callback path, 14 layout-shift check), plus 11 newly-introduced problems.

Both verbatim records: `g1-confirmation-claude.md`, `g1-confirmation-codex.md`.

## The blocking one

The Claude pass found that the first draft's `shouldRevalidate` rule - "when the pathname is
unchanged and the only search-parameter difference is `expanded`, return `false`" - is
vacuously true on a revalidation, where the two URLs are identical and the difference set is
empty. Because `shouldRevalidateLoader` (`router.js:2065-2071`) lets a route predicate
override `defaultShouldRevalidate` even when revalidation is required, that would have
silently no-opped **every** revalidation: Retry, Refresh, and - because the draft put the
predicate on the `authenticated` route - phase 2's `createBackForwardRestore`, which calls
`router.revalidate()` on a persisted `pageshow` specifically so `requireSession` re-runs after
a bfcache restore. Shipping it would have been an auth regression delivered under the promise
that phase 2 was untouched. Verified independently against
`/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/src/app/routing/createBackForwardRestore.ts:18`.

## Round-2 changes made in response

PRODUCT.md: sparse-array `null` holes are absent indices, not dropped rows; the
envelope-invisibility invariant no longer claims a deletion renders identically; person ids
must be safe positive integers, matching the expansion grammar; the cancelled outcome no
longer implies page-held previous state; photo-failure dedupe is per person per load, not per
row instance; initials match `deriveInitials`'s actual first-word/last-word behaviour; the
layout-shift invariant names a bounding-box assertion; the `*` no-op case is decided; the
route-viewed premise is corrected (a toggle runs no loader, so no interaction opens and no
route-viewed fires); the decision-log count is eight everywhere; the runtime's clock and the
retry callbacks join the named shared-surface list.

TECH.md: the `shouldRevalidate` rule is stated exactly and scoped to the index route only,
with the bfcache reason recorded; Retry/Refresh live in the route module behind `onRetry`/
`onRefresh` props so the `beginInteraction` wrapping cannot be bypassed; cancellation is wired
by forwarding `request.signal`; the analytics augmentation targets the declaring module rather
than the barrel; `Runtime` exposes its clock; the milestone split names four deliberate
overlaps and moves three telemetry invariants to milestones that can actually verify them;
the test plan adds invalid primitive envelopes, the `null`-hole case, the identical-URL
predicate case, the remount photo case and the second-`*` case; and the local mixed-content
limitation is stated rather than assumed away.
