import type { Configuration } from '@platform/configuration';
import { ObservabilitySink } from '@platform/configuration';
import { createConsoleSink } from './sinks/createConsoleSink';
import { createNoOpSink } from './sinks/createNoOpSink';
import { createRingBufferSink } from './sinks/createRingBufferSink';
import type { TelemetryRecord } from './telemetryRecord';

export type BufferHandle = { read: () => readonly TelemetryRecord[] } | null;

export function createSink(sinkKind: Configuration['observabilitySink']): {
  sink: (record: TelemetryRecord) => void;
  bufferHandle: BufferHandle;
} {
  if (sinkKind === ObservabilitySink.Buffer) {
    const ringBuffer = createRingBufferSink();
    return { sink: ringBuffer.write, bufferHandle: { read: ringBuffer.read } };
  }
  if (sinkKind === ObservabilitySink.Console) {
    return { sink: createConsoleSink(), bufferHandle: null };
  }
  return { sink: createNoOpSink(), bufferHandle: null };
}
