# G1 delta - Codex supplementary pass, round 5 (NOT the operative pass)

Codex session `019ffa92-869a-71f3-8406-f5353475b88e`, job `task-msrcn25z-44hdzd`.
Duration 4m 21s.

Provenance, stated plainly: this pass was launched by the `codex:rescue` skill invocation
BEFORE the full A-E delta brief was sent, so it answered a broader carry-over question
rather than the scoped delta contract. The operative pass for this round is
`g1-codex-delta.md`. This one is preserved rather than discarded because it is properly
formatted, cites concrete file:line evidence, and raised three defects the operative pass
and the Claude grill both missed. Each was verified against the files before recording:

- loop.json chronology (Codex-53) - CONFIRMED: the scope-change entry is stamped
  2026-08-13T10:45:00Z while the CLI-stamped entries around it read 10:13-10:15Z.
- CACHE.md overstates GOAL.md (Codex-54) - CONFIRMED: `grep -ci cach specs/GOAL.md` = 0,
  so GOAL.md cannot "now say there is no cache".
- TECH.md line 41 self-contradiction (Codex-55) - CONFIRMED: the same sentence says the
  ARCHITECTURE.md layer-count defect "HAS been fixed in the same change" and that
  correcting it "belongs to a separate edit of ARCHITECTURE.md by its owner".

Its other findings duplicate the operative pass or the Claude grill and were not
double-recorded: ARCHITECTURE "deferred" = Codex-52, production branch = Codex-48,
conventions/barrels = Codex-50/51 and Claude-53.

Verbatim output follows.

---

Verdict: FAIL

## Carry-over findings from prior review rounds

- **Resolved - Codex-26.** The budget estimate now consistently means the fixed runtime dependencies alone in [PRODUCT.md](</hierarchy-tree/specs/phase-1-setup/PRODUCT.md:160>), [TECH.md](</hierarchy-tree/specs/phase-1-setup/TECH.md:809>), and [ARCHITECTURE.md](</hierarchy-tree/specs/ARCHITECTURE.md:172>).

- **Resolved - Codex-43.** `reportRootError(error, { observability, interactionTracker })` can now access primitive deduplication state ([TECH.md](</hierarchy-tree/specs/phase-1-setup/TECH.md:682>)).

- **Resolved - Codex-44.** `expected-build-output.json` now has explicit assertion-family keys and uniform activation semantics ([TECH.md](</hierarchy-tree/specs/phase-1-setup/TECH.md:768>)); M5 populates all four when their artifacts appear ([TECH.md](</hierarchy-tree/specs/phase-1-setup/TECH.md:863>)).

- **Resolved by withdrawal - cache findings Claude-1/2/23/32/41 and Codex-3/4/5/18/19.** Invariants 36-44 are retired ([PRODUCT.md](</hierarchy-tree/specs/phase-1-setup/PRODUCT.md:65>)); TECH delivers no cache behavior or checks ([TECH.md](</hierarchy-tree/specs/phase-1-setup/TECH.md:911>)); ROADMAP excludes caching from every phase ([ROADMAP.md](</hierarchy-tree/specs/ROADMAP.md:113>)).

- **Partially resolved - Codex-16.** ARCHITECTURE now correctly says “Four layers” ([ARCHITECTURE.md](</hierarchy-tree/specs/ARCHITECTURE.md:16>)), but TECH simultaneously says the defect “HAS been fixed in the same change” and that correcting it “belongs to a separate edit” ([TECH.md](</hierarchy-tree/specs/phase-1-setup/TECH.md:41>)).

- **Resolved by explicit human acceptance - Claude-31 and the thin entry-budget residual.** The ledger records acceptance of both residuals and preserves the React Router uncertainty until M5 ([loop.json](</hierarchy-tree/specs/phase-1-setup/loop.json:591>)). The delta does not reopen either.

## New findings

1. **Major - Cache scope is still contradictory.**
   Path/text: [ARCHITECTURE.md](</hierarchy-tree/specs/ARCHITECTURE.md:78>) says request dedupe, TTL, and stale-while-revalidate “are deferred”; its binding decision log says the cache is “withdrawn from the roadmap, not designed and deferred” ([ARCHITECTURE.md](</hierarchy-tree/specs/ARCHITECTURE.md:161>)); PRODUCT explicitly says “not deferred to a later phase” ([PRODUCT.md](</hierarchy-tree/specs/phase-1-setup/PRODUCT.md:217>)).
   Why: “Deferred” implies planned future work and can reintroduce scope that the decision log expressly removed.
   Suggested fix: replace “are deferred” with “are outside this roadmap and may be reconsidered only through a new architecture decision.”

2. **Major - The new module conventions are both internally violated and unverified.**
   Path/text: TECH requires “Every multi-file folder” to have an `index.ts`, consumers to import only the folder, named exports only, and every component to use `memo` ([TECH.md](</hierarchy-tree/specs/phase-1-setup/TECH.md:58>)). Its own required layout omits barrels from multi-file module folders including `app/routing/routes`, `shared/theme`, and `platform/observability/sinks` ([TECH.md](</hierarchy-tree/specs/phase-1-setup/TECH.md:133>), [TECH.md](</hierarchy-tree/specs/phase-1-setup/TECH.md:173>), [TECH.md](</hierarchy-tree/specs/phase-1-setup/TECH.md:214>)). No invariant or validation-map entry checks these rules, despite PRODUCT promising that every stated rule has a check ([PRODUCT.md](</hierarchy-tree/specs/phase-1-setup/PRODUCT.md:13>)).
   Why: an implementer cannot satisfy the prose and prescribed layout simultaneously, while CI cannot enforce the claimed conventions.
   Suggested fix: define the exact folders where barrels are required, update the layout, and add lint/config tests for binding rules; otherwise label the conventions non-binding guidance.

3. **Major - Production deployment depends on an unstated Cloudflare project setting.**
   Path/text: TECH claims `--branch=main` “marks the upload as the production deployment” ([TECH.md](</hierarchy-tree/specs/phase-1-setup/TECH.md:838>)), while invariant 126 requires only creating a direct-upload project and secrets ([PRODUCT.md](</hierarchy-tree/specs/phase-1-setup/PRODUCT.md:179>)). Cloudflare’s setup chooses/configures a production branch separately; matching that configured branch determines production rather than preview deployment ([Cloudflare Direct Upload documentation](https://developers.cloudflare.com/pages/get-started/direct-upload/)).
   Why: if the project’s production branch is not `main`, the workflow can create a preview while invariants 120 and 123 claim production deployment.
   Suggested fix: require “production branch = `main`” in invariant 126/M6 setup, and assert the returned deployment URL corresponds to the recorded production hostname.

4. **Minor - The loop ledger is chronologically inconsistent.**
   Path/text: the scope-change event is timestamped `10:45:00`, followed by the later sign-off decision at `10:00:50`; top-level `updated` is also `10:00:50` ([loop.json](</hierarchy-tree/specs/phase-1-setup/loop.json:10>), [loop.json](</hierarchy-tree/specs/phase-1-setup/loop.json:590>)).
   Why: resumptions cannot reliably determine event order or which state is latest.
   Suggested fix: correct the sign-off timestamp and set `updated` to the actual latest event.

5. **Minor - CACHE.md overstates GOAL.md.**
   Path/text: CACHE says ARCHITECTURE and GOAL “both now say there is no cache” ([CACHE.md](</hierarchy-tree/specs/CACHE.md:5>)); GOAL contains no caching decision ([GOAL.md](</hierarchy-tree/specs/GOAL.md:1>)).
   Why: it misidentifies the binding source for the withdrawal.
   Suggested fix: say ARCHITECTURE and ROADMAP exclude caching; GOAL remains feature-focused.

## Open questions that need a human decision

- Are the new naming/barrel/`memo` conventions binding acceptance requirements or implementation guidance?
- Should caching be described as permanently outside this three-phase roadmap, while remaining reconsiderable after it?
- Is the Cloudflare Pages project already configured with `main` as its production branch?


Codex session ID: 019ffa92-869a-71f3-8406-f5353475b88e
Resume in Codex: codex resume 019ffa92-869a-71f3-8406-f5353475b88e
