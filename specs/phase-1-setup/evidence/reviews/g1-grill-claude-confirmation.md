# G1 fix-confirmation - fresh loop-spec-validator instance

Reviewer: a FRESH `agentic-loop:loop-spec-validator` instance (Claude-side role subagents have no thread continuity, so raiser confirmation is by independent re-check, per m-path.md phase 3 step 3). Read-only by tool restriction. Date: 2026-08-13.

Brief: re-check each of the 26 original grill findings against the revised specs, then attack the fixes themselves.

Verdict: **9 of 26 unresolved (1 blocking) - 17 RESOLVED, 9 PARTIALLY RESOLVED, 0 NOT RESOLVED. Plus 16 new findings (3 blocking).**

Verified against installed code: `onCaughtError`/`onUncaughtError` confirmed present on both `RootOptions` and `HydrationOptions` in `node_modules/@types/react-dom/client.d.ts` lines 16-55. `react-router` is not installed, so its internal `console.error` behavior (finding 31) is FROM TRAINING and must be re-verified in M5.

Attacks the specs SURVIVED: the 38/40 read-during-revalidation sequence, `clear()`/`invalidate()` against an in-flight load and a revalidation, two callers disagreeing through the registry, the facade's three-key assertion against the factory's two-key return, the redaction-throw path, the cancelled-vs-failure exhaustiveness test, and the dual-theme axe claim.

The full per-finding re-check and findings 27-42 are recorded in the loop state ledger (`loop finding phase-1-setup list --gate G1`) and summarised below.

