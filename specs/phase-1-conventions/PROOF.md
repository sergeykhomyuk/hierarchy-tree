# Proof of completion: phase-1-conventions

## Task

Align `phase-1-setup`'s code with the `typescript-coding` and `react-coding` skills' conventions: convert literal-union types to the const-object enum pattern, wrap presentational/routing components in `memo()`, dedupe a duplicated pure helper (`bytesToHex`) into `shared/utils`, and decompose files that had grown too many unrelated top-level entities into single-purpose sibling files. Strict behavior-preservation contract throughout - zero functional change, structural only.

## Requirements -> evidence

- **AC1: `bytesToHex` deduped into `shared/utils`, output format unchanged (lowercase, zero-padded hex).**
  - Test: `src/shared/utils/bytesToHex.test.ts::bytesToHex` - passing (`npx vitest run`, 2026-08-14)
  - `evidence/step1-red.txt` - module-not-found before extraction
  - `evidence/step1-green.txt`, `evidence/step1-typecheck.txt`

- **AC2: `LogLevel`/`ObservabilitySink` const-object enums replace string literal unions in `platform/configuration`, accepted values/validation/defaults unchanged.**
  - Test: `src/platform/configuration/createConfiguration.test.ts::createConfiguration`, `src/platform/observability/createObservability.test.ts::createObservability` - passing
  - `evidence/step2-green.txt`, `evidence/step2-typecheck.txt`

- **AC3: `NavigationState` const-object enum replaces string literal union in `app/routing`.**
  - Test: `src/app/routing/createInteractionTracker.test.ts::createInteractionTracker` - passing
  - `evidence/step3-green.txt`, `evidence/step3-typecheck.txt`

- **AC4: `WebVitalMetricName` const-object enum introduced; `analyticsEvents.ts` + `reportWebVitals.ts` deduped against it.**
  - Test: `src/platform/observability/reportWebVitals.test.ts::reportWebVitals` - passing
  - `evidence/step4-green.txt`, `evidence/step4-typecheck.txt`

- **AC5: `ApplicationRoot`, `KitRoute`, `ApplicationLayout`, `RouteErrorBoundary`, `ErrorSurface`, `NotFoundRoute` wrapped in `memo()`; rendered output/props contract unchanged; the one class-based error boundary (`RootErrorBoundary`) correctly excluded.**
  - Test: `ApplicationRoot.test.tsx`, `KitRoute.test.tsx`, `ApplicationLayout.test.tsx`, `RouteErrorBoundary.test.tsx`, `ErrorSurface.test.tsx`, `NotFoundRoute.test.tsx` - passing
  - `evidence/step5-green.txt`, `evidence/step5-typecheck.txt`

- **AC6: `createObservability.ts` (113 lines / 8 mixed-concern top-level entities) decomposed into single-purpose sibling files (`logLevelSeverity.ts`, `logRecord.ts`, `createSink.ts`), matching the directory's existing one-function-per-file convention; public barrel surface (`@platform/observability`) unchanged.**
  - Test: `createObservability.test.ts::createObservability`, `sinks/sinkImportGraph.test.ts::sink import graph` - passing
  - `evidence/step6-green.txt`, `evidence/step6-typecheck.txt`, `evidence/step6-lint.txt`

- **AC7: `createHttpClient.ts` (269 lines) decomposed into single-purpose sibling files (`buildUrl.ts`, `statusDescription.ts`, `performAttempt.ts` + `AttemptOutcome`); public barrel surface (`@platform/http`) unchanged.**
  - Test: `createHttpClient.test.ts::createHttpClient` - passing
  - `evidence/step7-green.txt`, `evidence/step7-typecheck.txt`, `evidence/step7-lint.txt`

## Verification summary

- Full suite: `npx vitest run` -> green, 68 files / 283 tests (2026-08-14, run after every step)
- Full CI verify chain: `npm run verify` (typecheck + lint + format:check + test:coverage + build + verify:build + size) -> green end-to-end, `evidence/verify-full.txt`
  - Coverage: 96.28% statements, 96.33% branches, 95.12% functions, 96.27% lines (floor: 85%)
  - `verify:build`: 8 files / 15 tests passing
  - `size`: app entry 112.92 kB gzipped / 150 kB budget
- No e2e delta: pure structural refactor, no new/changed user-facing surface, no route or interaction behavior touched
- Only non-test importer of `createObservability.ts` and `createHttpClient.ts` was each module's own `index.ts` barrel (verified by grep before the split) - no consumer import paths changed

## Reviews

- **Claude fresh-context review**: 1 finding, 0 blocking - `evidence/reviews/g4-claude-review.md`. Fixed (Claude-1): stale eslint diagnostic message.
- **Codex second opinion**: 2 findings, 1 blocking - `evidence/reviews/g4-codex-review.md`. Codex-2 duplicate of Claude-1, fixed. Codex-1 (blocking): the `SINKS_IMPORT_PATTERN` eslint rule's glob doesn't catch a relative sink import (e.g. `./sinks/createConsoleSink`) from a sibling file inside `src/platform/observability/`. Verified independently (live probe file, `npx eslint` exits 0) - real, but the glob is byte-identical before and after this diff (only its message string moved with the override), so it predates this loop entirely and is not a regression from decomposing the two files. User decision: accepted as out of scope for this S-size behavior-preservation refactor (see Known limitations).
- Security pass: not flagged for this loop (no auth/secrets/input-parsing/PII surface touched).

## Known limitations / accepted findings

- **Codex-1 (accepted, not fixed)**: the eslint `no-restricted-imports` ban on constructing observability sinks outside the designated owner file can be bypassed by a relative import from another file already inside `src/platform/observability/` (the pattern's glob only matches specifiers containing the literal text `observability/sinks`, which a same-directory relative import never does). Pre-existing since the `sinks/` subdirectory was introduced in `phase-1-setup`; unaffected by this loop's file moves. Recommended follow-up: a source-scan test analogous to `sinks/sinkImportGraph.test.ts` but checking *importers* of `createSink.ts`'s sink modules, rather than relying on the eslint glob alone.
