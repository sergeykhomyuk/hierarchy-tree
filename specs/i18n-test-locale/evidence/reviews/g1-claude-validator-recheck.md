# G1 fix-confirmation - fresh loop-spec-validator instance

## Verdict on the 5 tracked findings

1. **Claude-1 (doc consistency) - RESOLVED.** The spec's Non-goals section now states "all three are edited by this spec (not left standing)" and the "Decision-log text (R12)" section gives concrete before/after text for all 5 edits: ARCHITECTURE.md's decision log, ARCHITECTURE.md §7, ROADMAP.md:115, PRODUCT.md's not-built list, and PRODUCT.md invariant 65. Independently confirmed all five current-state quotes against the live files and they match verbatim.

2. **Claude-2 (createRuntime.ts wiring test) - RESOLVED.** Invariant 8 now says the exact wiring is directly tested via a new case in the existing `createRuntime.test.ts` - no hedge language remains. Confirmed `createRuntime.test.ts` exists with 4 tests today and `createRuntime.ts:26,58` still has the hardcoded constant the spec proposes to replace.

3. **Codex-1 (invalid locale tag) - RESOLVED, consistently applied** (at the time of this check, against the `'pseudo'` value - see round-2 Codex review for the subsequent `'pseudo'` -> `'zxx'` correction). Grepped the full spec for the literal old `'test'` value and found zero matches. Lacked shell/execution access to independently re-run the Intl probe in this pass (this is exactly the gap the subsequent axe-core execution check closed).

4. **Codex-2 (generator non-mutation) - RESOLVED.** Invariant 6 explicitly requires non-mutation with a corresponding test requirement.

5. **Codex-3 (invariant 16 contradiction) - RESOLVED.** Invariant 16 and the testing plan now agree: both files gain a new test case, existing case unchanged. Confirmed against the actual current test files.

## New findings from the revision

None blocking. Two non-blocking observations: Codex-4 deferred to G3 as a defensible, explicitly-testable deferral rather than a silent gap; Claude-3 acknowledged with a documented fallback plan.

## Overall verdict

All 5 tracked findings resolved with no new blocking issues, AT THE TIME OF THIS CHECK. Superseded in part by the subsequent Codex round-2 executed-axe-core finding that the chosen locale value (`'pseudo'` at the time) failed a check this pass had no tooling to run - see `g1-codex-review-round2.md` and the final `'zxx'` resolution.
