import type { TelemetryRecord } from '../telemetryRecord';

export function createConsoleSink(): (record: TelemetryRecord) => void {
  return (record) => {
    if (record.kind === 'log') {
      console[record.level](record.event, record.attributes);
      return;
    }
    console.debug(record.kind, record);
  };
}
