import { afterEach, describe, expect, it, vi } from 'vitest';
import { ObservabilitySink } from '@platform/configuration';
import { createSink } from './createSink';
import type { TelemetryRecord } from './telemetryRecord';

function logRecord(event: string): TelemetryRecord {
  return { kind: 'log', level: 'debug', event };
}

describe('createSink', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('buffer: returns a readable buffer handle that reflects written records', () => {
    const { sink, bufferHandle } = createSink(ObservabilitySink.Buffer);

    sink(logRecord('first'));
    sink(logRecord('second'));

    expect(bufferHandle).not.toBeNull();
    expect(
      bufferHandle?.read().map((record) => (record as { event: string }).event),
    ).toEqual(['first', 'second']);
  });

  it('console: writes through console and returns no buffer handle', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const { sink, bufferHandle } = createSink(ObservabilitySink.Console);

    sink(logRecord('thing.happened'));

    expect(spy).toHaveBeenCalled();
    expect(bufferHandle).toBeNull();
  });

  it('none: the sink is a no-op and returns no buffer handle', () => {
    const { sink, bufferHandle } = createSink(ObservabilitySink.None);

    expect(() => sink(logRecord('thing.happened'))).not.toThrow();
    expect(bufferHandle).toBeNull();
  });
});
