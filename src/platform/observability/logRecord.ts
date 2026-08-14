import type { TelemetryRecord } from './telemetryRecord';

export function logRecord(
  level: 'debug' | 'info' | 'warn' | 'error',
  event: string,
  attributes: Readonly<Record<string, unknown>> | undefined,
): TelemetryRecord {
  return {
    kind: 'log',
    level,
    event,
    ...(attributes !== undefined ? { attributes } : {}),
  };
}
