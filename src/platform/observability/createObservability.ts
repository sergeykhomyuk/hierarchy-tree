import type { Configuration } from '@platform/configuration';
import type { Randomness } from '@platform/runtime';
import { createCorrelationId } from './createCorrelationId';
import { createSink, type BufferHandle } from './createSink';
import { LOG_LEVEL_SEVERITY } from './logLevelSeverity';
import { logRecord } from './logRecord';
import type { ObservabilityFacade } from './observabilityFacade';
import { redact } from './redact';
import type { TelemetryRecord } from './telemetryRecord';

const FALLBACK_CORRELATION_ID = '0'.repeat(32);

export type ObservabilityDependencies = {
  configuration: Pick<Configuration, 'observabilitySink' | 'logLevel'>;
  randomness: Randomness;
};

export type Observability = {
  facade: ObservabilityFacade;
  bufferHandle: BufferHandle;
};

export function createObservability(
  dependencies: ObservabilityDependencies,
): Observability {
  const { sink, bufferHandle } = createSink(
    dependencies.configuration.observabilitySink,
  );
  const thresholdSeverity =
    LOG_LEVEL_SEVERITY[dependencies.configuration.logLevel];

  function dispatch(record: TelemetryRecord): void {
    try {
      if (
        record.kind === 'log' &&
        LOG_LEVEL_SEVERITY[record.level] < thresholdSeverity
      ) {
        return;
      }
      sink(redact(record));
    } catch {
      // invariant 59: an observability call never throws into application code.
    }
  }

  const facade: ObservabilityFacade = {
    logger: {
      debug: (event, attributes) =>
        dispatch(logRecord('debug', event, attributes)),
      info: (event, attributes) =>
        dispatch(logRecord('info', event, attributes)),
      warn: (event, attributes) =>
        dispatch(logRecord('warn', event, attributes)),
      error: (event, attributes) =>
        dispatch(logRecord('error', event, attributes)),
    },
    tracer: {
      recordTiming: (record) => dispatch({ kind: 'timing', timing: record }),
      startInteraction: () => {
        // invariant 59 covers the whole facade, not only dispatch-routed
        // calls: a throwing randomness source must not escape either.
        try {
          return createCorrelationId(dependencies.randomness);
        } catch {
          return FALLBACK_CORRELATION_ID;
        }
      },
    },
    analytics: {
      track: (name, payload) => dispatch({ kind: 'analytics', name, payload }),
    },
  };

  return { facade, bufferHandle };
}
