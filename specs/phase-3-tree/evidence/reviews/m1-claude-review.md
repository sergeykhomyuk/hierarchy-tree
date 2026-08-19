# M1 boundary review (Claude, fresh context)

Reviewer: `agentic-loop:loop-reviewer` subagent, spawned on the M1 diff
(`git diff 2e0cc06..HEAD`, excluding `specs/phase-3-tree/evidence/logs/` and
`specs/phase-3-tree/loop.json`).

## Review summary

I reviewed the full diff text at `/private/tmp/claude-501/.../scratchpad/m1-diff.txt`,
cross-checked the cycle-detection, dedup, and flatten/setSize logic against
`specs/phase-3-tree/TECH.md` and `specs/phase-3-tree/PRODUCT.md` invariants, and checked
boundary/lint enforcement in `eslint.config.js` and `scripts/assert-domain-vocabulary.mjs`.

I traced the white/grey/black cycle-detection walk by hand against several constructed cases
(a 3-ring where the DFS entry point coincides with the earliest member, and a case where a
non-ring "feeder" chain enters a ring from an earlier index than the ring's own entry point)
— in both cases `Math.min(...cycleIndices)` correctly selects the true earliest-payload-order
member regardless of DFS traversal order, because the outer loop always visits `survivors` in
ascending (payload) order and only starts a walk at a still-white node. I also traced the
topological "ready queue" build step and confirmed children-array order is fixed by
`childrenIndicesByIndex` construction order (ascending index / payload order), independent of
the order nodes are popped off `readyIndices`, so build order never perturbs the ordering
invariant. `setSize`/`posInSet` in `flattenVisible.ts` are computed from the original
(pre-push-reversal) index at push time, so the LIFO stack reversal used to get
pre-order-without-recursion doesn't create an off-by-one. Duplicate-id dedup
(first-occurrence-wins) is applied before the cycle walk and before manager-index resolution,
so a dropped duplicate can never contribute to `selfManaged`/`danglingManager`/`cycleBroken`,
matching the "counts computed after duplicate removal" invariant in TECH.md.

I verified no `any`, no banned `enum` (VisitColor uses the const-object + derived union
pattern correctly), and the only `as` casts are the two brand-widening casts inside
`personIdentifier.ts`/`emailAddress.ts`'s own constructors (the permitted exception). No React
imports, no recursion, no mutation of the `people` input array or `Person` objects (confirmed
by code inspection, not just by the freeze-based test). `expansionParameter.ts` exporting two
functions (`parseExpansion`+`formatExpansion`) looks at first glance like it violates "one
exported symbol's main concept per file," but TECH.md explicitly specifies this exact file
shape ("expansionParameter.ts - parseExpansion(raw, forest) and formatExpansion(ids)"), so
it's a sanctioned pairing (parse/format of one wire format), not a violation.

**Verdict: 2 findings (0 blocking)**

## Findings

1. `src/features/hierarchy/domain/emailAddress.ts` and `emailAddress.test.ts:1-13` — the test
   is named "brands a non-empty string and rejects a non-string" but neither asserts nor
   enforces the non-empty half: `parseEmailAddress('')` passes through unchanged (only
   `typeof value !== 'string'` is checked). Concrete scenario: `parseEmailAddress('')` returns
   `''` typed as `EmailAddress` with no error. Checked `PRODUCT.md` invariant 52 — it only
   requires branding (rejecting a raw number/string at the type level), not content validation,
   and invariant 56 says the email "renders exactly as stored, with no trimming," which is
   consistent with skipping content validation here — so this is not a contract violation, just
   an overclaiming test name/description. Non-blocking.

2. `src/features/hierarchy/domain/flattenVisible.test.ts:874-888` — "expanding a node and
   collapsing it again reproduces the original row list exactly" doesn't actually exercise any
   expand/collapse round-trip: `flattenVisible` is a pure, stateless function of its
   `expandedIds` argument, so calling it with two separate empty `Set` instances (`collapsed`
   and `collapsedAgain`) only reconfirms basic determinism; the intervening
   `flattenVisible(roots, new Set([1]))` call is discarded and has no bearing on the result.
   The test would pass identically against any correct-but-differently-refactored stateless
   implementation; it does not detect any hypothetical caching/memoization bug the name implies
   it guards against. Non-blocking.

## Answers to review questions

- Cycle-detection correctness: sound. Verified by hand-trace that `Math.min(...cycleIndices)`
  picks the true payload-order-earliest ring member even when the DFS enters the ring from a
  non-ring feeder node at a lower index than the ring's own nodes, and that disjoint rings in
  the same input are each broken independently and correctly.
- Duplicate-id dedup correctness: sound, first-occurrence-wins via `indexById.has` before any
  downstream anomaly counting; the dropped duplicate's own `managerId`/self-reference never
  leaks into `selfManaged`/`danglingManager`/`cycleBroken` counts. `counts.people`/
  `counts.managers` are computed post-dedup and post-cycle-break as TECH.md requires.
- Off-by-one in setSize/posInSet: none found; `posInSet` is fixed at 1-based index at push
  time (before the reverse-push for stack-LIFO ordering), so pop order never disturbs it.
- Regressions: none identified — the tripwire-retirement change in
  `scripts/assert-domain-vocabulary.mjs` is scoped exactly to `buildForest`/`flattenVisible`/
  `role="tree"`; `make32`/`POISON_ARRAY` and the `/secrets` check are untouched, and the new
  guard test explicitly asserts both the retirement and the survival of the other bans.
- Purity/no-recursion/no-mutation: confirmed by code reading (not just the freeze-based test)
  — no assignment to `people` elements or `Person` fields anywhere in `buildForest.ts`, all
  traversal is `for`/`while`, no self-recursive calls.
- Banned casts/enum: none found beyond the two permitted brand-widening casts; `VisitColor`
  correctly uses the const-object + derived-union convention instead of `enum`.
- Reuse/simplification: `elementAt.ts` and `popElement.ts` are near-identical bounds-check
  helpers; the commit message notes this is intentional (mirroring the existing convention
  rather than introducing a new one), and no correctness cost to keeping them separate, so not
  flagged as a finding.
- Domain barrel (`domain/index.ts`) omits `buildForest`, `flattenVisible`, `defaultExpansion`,
  `parseExpansion`/`formatExpansion` — checked `eslint.config.js`'s boundary rules and
  confirmed intra-feature relative imports are unrestricted (only cross-feature `@features/*/*`
  deep imports are banned), and TECH.md's "single entry" language refers to the feature-level
  `src/features/hierarchy/index.ts` (not yet built), not this domain sub-barrel. Not currently
  consumed by anything in this diff, so not raised as a finding.
