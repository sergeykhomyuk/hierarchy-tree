# G4 Codex second opinion - phase-1-conventions

Reviewed: `git diff 8837a0d..HEAD -- src/ eslint.config.js specs/ARCHITECTURE.md` (all 7 steps, full loop diff)
Invoked via: codex:rescue skill, fresh thread, read-only

## Verdict

2 findings (1 blocking)

## Findings

1. The sink restriction can be bypassed from any sibling observability module using `./sinks/...` because the patterns only match aliases or paths containing `observability/sinks`; a read-only ESLint probe against `redact.ts` exited 0 for `./sinks/createConsoleSink` | `eslint.config.js:139-143, 554-598` | Another observability file can construct a sink despite the single-owner invariant; equivalent alias and parent-relative probes correctly failed | BLOCKING
2. The committed lint diagnostic still directs developers to `createObservability.ts`, although ownership and the exception moved to `createSink.ts` | `eslint.config.js:139-143` at reviewed HEAD `b7a5238` | A forbidden import produces incorrect remediation guidance; the working tree contains an uncommitted wording correction, but it is outside the requested `8837a0d..HEAD` diff | non-blocking

## Acceptance criteria answers

- Behavior preservation: satisfied by inspection (defaults, event records, HTTP outcomes, retries, abort handling, request construction, URL validation). The lint-architecture acceptance criterion fails because of finding 1.
- bytesToHex: satisfied, both consumers import the single barrel export, direct test proves lowercase/zero-padding/empty-input.
- shared/utils boundary: satisfied by configuration - matched before general `shared`, may import only itself, platform may import platform + shared-utils only.
- Const-object enums: satisfied, all replaced members present (LogLevel, ObservabilitySink, NavigationState, WebVitalMetricName).
- Memo components: satisfied, all six are `memo(function ExportedName...)`, RootErrorBoundary unchanged (class).
- Observability decomposition: function bodies/constants logic-equivalent, BufferHandle moved without shape change, exception moved to createSink.ts but sole ownership not enforced (finding 1).
- HTTP decomposition: buildUrl/statusDescription/performAttempt/AttemptOutcome logic-identical to prior inline definitions.
- Public surfaces: satisfied, both barrels retain every prior export.

## Test discrimination

No test negative-checks the sink-import restriction; the existing sinkImportGraph.test.ts inspects what sink modules import, not which modules may import sinks. Full verification (68 files/283 tests) was not re-run by Codex; it examined the diff, ran `git diff --check`, and focused read-only ESLint probes.

## Verification note (added by loop driver, not Codex)

Confirmed independently: `SINKS_IMPORT_PATTERN`'s `group` glob is byte-identical before and after this diff (`git diff 8837a0d -- eslint.config.js` shows only the message string changed on that block). A live probe (`src/platform/observability/sinkBypassProbe.ts` importing `./sinks/createConsoleSink`, deleted after the check) confirms `npx eslint` exits 0 - the bypass is real, but it predates this refactor loop entirely and is not a regression introduced by steps 1-7.
