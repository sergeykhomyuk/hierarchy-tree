# Plan: phase-1-conventions - Align code with react-coding/typescript-coding conventions

## Brief
Mechanical convention-alignment refactor, no behavior change. Three surfaces: (1) literal-union
"status" types that scatter their value set across files become `as const` object enums per
typescript-coding (`LogLevel`, `ObservabilitySink` in platform/configuration; `NavigationState` in
app/routing; `WebVitalMetricName`, deduped between analyticsEvents.ts and reportWebVitals.ts, in
platform/observability); (2) all exported function components get wrapped in `memo` with a named
inner function per react-coding (`ApplicationRoot`, `KitRoute`, `ApplicationLayout`,
`RouteErrorBoundary`, `ErrorSurface`, `NotFoundRoute` - `RootErrorBoundary` is a class-based error
boundary and is intentionally excluded, `memo` targets function components); (3) `bytesToHex`,
duplicated identically in `createCorrelationId.ts` and `createTraceparent.ts`, moves to a new
`shared/utils` folder per typescript-coding's one-symbol-per-file + low-coupling shared-module
rules. Scope confirmed with the user: platform/app-layer literal unions only - shared/ui
component variant props (Card padding, Avatar size, Skeleton shape, Button variant) and unions
that mirror an external platform API 1:1 (HTTP methods, `ltr`/`rtl`, TelemetryRecord's log
level) are left alone.

## Acceptance criteria
- AC1: `Configuration.logLevel` and `Configuration.observabilitySink` are typed via `LogLevel`/
  `ObservabilitySink` const-object enums (`src/platform/configuration/logLevel.ts`,
  `observabilitySink.ts`); the Zod schema derives its accepted values from the same enums (single
  source of truth); all existing config/observability behavior (defaults, validation, sink
  selection, severity filtering) is unchanged.
- AC2: `NavigationState` moves to its own module (`src/app/routing/navigationState.ts`) as a
  const-object enum; `createInteractionTracker.ts`'s state comparison uses it; behavior unchanged.
- AC3: `WebVitalMetricName` moves to its own module
  (`src/platform/observability/webVitalMetricName.ts`) as a const-object enum, replacing the two
  independent literal-union declarations in `analyticsEvents.ts` and `reportWebVitals.ts`;
  `app.web_vital` analytics event behavior unchanged.
- AC4: `ApplicationRoot`, `KitRoute`, `ApplicationLayout`, `RouteErrorBoundary`, `ErrorSurface`,
  `NotFoundRoute` are wrapped in `memo` with a named inner function; rendered output/props
  contract unchanged.
- AC5: `bytesToHex` lives once, in `src/shared/utils/bytesToHex.ts` (barrel-exported via
  `src/shared/utils/index.ts`), with its own direct unit test; `createCorrelationId.ts` and
  `createTraceparent.ts` import it instead of each declaring their own copy; output format
  (lowercase, zero-padded hex) unchanged.

## Steps
1. Extract `bytesToHex` to `shared/utils` - tests:
   `src/shared/utils/bytesToHex.test.ts::bytesToHex > converts bytes to zero-padded lowercase hex`,
   `src/shared/utils/bytesToHex.test.ts::bytesToHex > returns an empty string for an empty byte array`
2. Introduce `LogLevel`/`ObservabilitySink` const-object enums, wire through configuration + Zod
   schema + observability - guarded by pre-existing tests (case c, `step na`):
   `src/platform/configuration/createConfiguration.test.ts`,
   `src/platform/observability/createObservability.test.ts`
3. Introduce `NavigationState` const-object enum, wire through `createInteractionTracker.ts` -
   guarded by pre-existing tests (case c, `step na`):
   `src/app/routing/createInteractionTracker.test.ts`
4. Introduce `WebVitalMetricName` const-object enum, dedupe `analyticsEvents.ts` +
   `reportWebVitals.ts` - guarded by pre-existing tests (case c, `step na`):
   `src/platform/observability/reportWebVitals.test.ts`
5. Wrap the six app-layer components in `memo` - guarded by pre-existing tests (case c,
   `step na`): `src/app/ApplicationRoot.test.tsx`, `src/app/kit-route/KitRoute.test.tsx`,
   `src/app/layout/ApplicationLayout.test.tsx`,
   `src/app/error-boundary/RouteErrorBoundary.test.tsx`,
   `src/app/error-boundary/ErrorSurface.test.tsx`,
   `src/app/routing/routes/NotFoundRoute.test.tsx`

## Verification
`npm run verify` (typecheck + lint + format:check + test:coverage + build + verify:build + size)
must pass green. No user-facing behavior changes, so no new Playwright flow is required; existing
e2e coverage (if any exercises these surfaces) must stay green. Evidence: command output captured
under `specs/phase-1-conventions/evidence/`.
