/// <reference types="vite/client" />
// vitest.setup.ts's `@testing-library/jest-dom/vitest` import registers
// the matchers at runtime, but only within tools' own tsconfig project;
// this app-project reference is what makes toBeInTheDocument() etc.
// typecheck in *.test.tsx files under src.
/// <reference types="@testing-library/jest-dom/vitest" />

import type { TelemetryRecord } from '@platform/observability';

declare global {
  // The buffer sink's read handle (invariants 45, 49) - attached only by
  // app/composition/createRuntime.ts, only when configuration.telemetryBufferHandle
  // is true. Undefined everywhere else, including every unit test unless
  // that test's own runtime attaches it.
  var __hierarchyTreeTelemetry:
    { read: () => readonly TelemetryRecord[] } | undefined;
}

export {};
