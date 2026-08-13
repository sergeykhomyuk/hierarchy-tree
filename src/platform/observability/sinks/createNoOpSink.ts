import type { TelemetryRecord } from '../telemetryRecord';

export function createNoOpSink(): (record: TelemetryRecord) => void {
  return () => {};
}
