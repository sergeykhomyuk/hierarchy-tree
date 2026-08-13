import type { AnalyticsEventName } from './analyticsEvents';
import type { TimingRecord } from './timingRecord';

type Attributes = Readonly<Record<string, unknown>>;

export type TelemetryRecord =
  | {
      kind: 'log';
      level: 'debug' | 'info' | 'warn' | 'error';
      event: string;
      attributes?: Attributes;
    }
  | { kind: 'timing'; timing: TimingRecord }
  | { kind: 'analytics'; name: AnalyticsEventName; payload: unknown };
