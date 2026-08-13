// Ambient augmentation for window.__hierarchyTreeTelemetry (set only when
// createRuntime.ts attaches the buffer handle - src/vite-env.d.ts declares
// the same global for src/, which e2e/'s own tsconfig project does not
// include).
type TelemetryRecord =
  | { kind: 'log'; level: string; event: string; attributes?: unknown }
  | { kind: 'timing'; timing: unknown }
  | { kind: 'analytics'; name: string; payload: unknown };

declare global {
  interface Window {
    __hierarchyTreeTelemetry?: { read: () => readonly TelemetryRecord[] };
  }
}

export type { TelemetryRecord };
