# G4 Claude fresh-context review - phase-1-conventions

Reviewed: `git diff 8837a0d..HEAD -- src/ eslint.config.js specs/ARCHITECTURE.md` (all 7 steps, full loop diff)
Agent: agentic-loop:loop-reviewer (fresh context, read-only)

## Verdict

1 finding (0 blocking)

## Findings

**1. Stale lint error message after moving the sink-construction override from `createObservability.ts` to `createSink.ts`.**
`eslint.config.js:139-143` defines `SINKS_IMPORT_PATTERN` with the message `'Sinks are constructed only by createObservability.ts (platform/observability).'`. Step 6 correctly moved the `no-restricted-imports: 'off'` override for the sinks-import ban from `createObservability.ts` to `createSink.ts` (eslint.config.js:594-599, confirmed `createObservability.ts` no longer imports anything from `./sinks/*`), but the message text shown to a developer who trips this rule still names the wrong file. A future contributor who imports a sink from, say, a feature module and gets this lint error would be pointed at `createObservability.ts` as "the one file allowed to construct sinks," which is no longer true - `createSink.ts` is. Non-blocking: purely a misleading diagnostic message, no functional or boundary-enforcement effect (the override is on the correct file).

## Answers to review questions

1. **Behavior preservation (steps 6-7)**: Every extracted function is logic-identical to what it replaced. `logLevelSeverity.ts` (`LOG_LEVEL_SEVERITY`), `logRecord.ts`, `createSink.ts` in observability, and `buildUrl.ts`, `statusDescription.ts`, `performAttempt.ts` (carrying `AttemptOutcome<Value>`) in http all preserve exact original semantics - including subtle invariants like the `signal.aborted` disambiguation in `performAttempt.ts`'s JSON-parse catch block and the origin-comparison URL-escape guard left inline in `createHttpClient.ts`. No circular import risk: `createObservability.ts` -> `createSink.ts` and `createHttpClient.ts` -> `performAttempt.ts` are strictly one-directional; neither new sibling imports back from its parent.

2. **Import/export correctness**: `src/platform/observability/index.ts` and `src/platform/http/index.ts` re-export the same public surface as before - types included (`BufferHandle` now sourced from `createSink.ts`, `Observability`/`ObservabilityDependencies` still from `createObservability.ts`; `HttpClient`/`HttpClientDependencies` still from `createHttpClient.ts`). `AttemptOutcome` was never part of the public surface before or after, so nothing broke there.

3. **eslint config correctness**: `createObservability.ts` no longer imports `./sinks/*` directly, so `createSink.ts` is correctly the sole file needing the override now. No other file bypasses the sinks-import ban. Only the error message text is stale (finding 1).

4. **Const-object enum conversions (steps 2-4)**: `LogLevel` (debug/info/warn/error/silent), `ObservabilitySink` (console/buffer/none), `NavigationState` (idle/loading/submitting), `WebVitalMetricName` (LCP/INP/CLS) all match their prior literal-union members exactly. No dropped or renamed member.

5. **memo() wrapping (step 5)**: All 6 target components wrapped as `export const X = memo(function X(props) {...})` - exported binding name and inner function name unchanged; no `displayName` reliance found. `RootErrorBoundary` remains a class component, correctly excluded.

6. **bytesToHex extraction (step 1)**: `src/shared/utils/bytesToHex.ts` produces the same lowercase, zero-padded-to-2-digits hex output as the prior duplicated inline versions. Both call sites now import from `@shared/utils` with the same byte lengths as before.

7. **General code quality**: No `any`, no unnecessary abstraction, diffs read as surgical single-purpose extractions, no leftover dead code.
