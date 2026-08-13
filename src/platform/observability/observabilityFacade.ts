import type { AnalyticsEventName, AnalyticsPayloads } from './analyticsEvents';
import type { CorrelationId } from './createCorrelationId';
import type { TimingRecord } from './timingRecord';

type Attributes = Readonly<Record<string, unknown>>;

export type ObservabilityFacade = {
  logger: {
    debug: (event: string, attributes?: Attributes) => void;
    info: (event: string, attributes?: Attributes) => void;
    warn: (event: string, attributes?: Attributes) => void;
    error: (event: string, attributes?: Attributes) => void;
  };
  tracer: {
    recordTiming: (record: TimingRecord) => void;
    startInteraction: () => CorrelationId;
  };
  analytics: {
    track: <Name extends AnalyticsEventName>(
      name: Name,
      payload: AnalyticsPayloads[Name],
    ) => void;
  };
};
