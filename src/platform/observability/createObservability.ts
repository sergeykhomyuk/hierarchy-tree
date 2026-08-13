import type { Configuration } from '@platform/configuration';
import type { Randomness } from '@platform/runtime';
import { createCorrelationId } from './createCorrelationId';
import type { ObservabilityFacade } from './observabilityFacade';
import { redact } from './redact';
import { createConsoleSink } from './sinks/createConsoleSink';
import { createNoOpSink } from './sinks/createNoOpSink';
import { createRingBufferSink } from './sinks/createRingBufferSink';
import type { TelemetryRecord } from './telemetryRecord';

const LOG_LEVEL_SEVERITY = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
} as const;

export type ObservabilityDependencies = {
  configuration: Pick<Configuration, 'observabilitySink' | 'logLevel'>;
  randomness: Randomness;
};

export type BufferHandle = { read: () => readonly TelemetryRecord[] } | null;

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
      startInteraction: () => createCorrelationId(dependencies.randomness),
    },
    analytics: {
      track: (name, payload) => dispatch({ kind: 'analytics', name, payload }),
    },
  };

  return { facade, bufferHandle };
}

function logRecord(
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

function createSink(sinkKind: Configuration['observabilitySink']): {
  sink: (record: TelemetryRecord) => void;
  bufferHandle: BufferHandle;
} {
  if (sinkKind === 'buffer') {
    const ringBuffer = createRingBufferSink();
    return { sink: ringBuffer.write, bufferHandle: { read: ringBuffer.read } };
  }
  if (sinkKind === 'console') {
    return { sink: createConsoleSink(), bufferHandle: null };
  }
  return { sink: createNoOpSink(), bufferHandle: null };
}
