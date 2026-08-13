import { describe, expect, it } from 'vitest';
import { createRingBufferSink } from './createRingBufferSink';
import type { TelemetryRecord } from '../telemetryRecord';

function logRecord(event: string): TelemetryRecord {
  return { kind: 'log', level: 'debug', event };
}

describe('createRingBufferSink', () => {
  it('reads written records oldest-first before it wraps', () => {
    const ringBuffer = createRingBufferSink();

    ringBuffer.write(logRecord('first'));
    ringBuffer.write(logRecord('second'));

    expect(
      ringBuffer.read().map((record) => (record as { event: string }).event),
    ).toEqual(['first', 'second']);
  });

  it('the ring buffer drops oldest and reads oldest-first after wrapping', () => {
    const ringBuffer = createRingBufferSink();
    const capacity = 256;

    for (let index = 0; index < capacity + 3; index += 1) {
      ringBuffer.write(logRecord(`event-${index}`));
    }

    const records = ringBuffer
      .read()
      .map((record) => (record as { event: string }).event);

    expect(records.length).toBe(capacity);
    expect(records[0]).toBe('event-3');
    expect(records[records.length - 1]).toBe(`event-${capacity + 2}`);
  });
});
