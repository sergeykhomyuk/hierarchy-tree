import type { TelemetryRecord } from '../telemetryRecord';

const RING_BUFFER_CAPACITY = 256;

export type RingBufferSink = {
  write: (record: TelemetryRecord) => void;
  read: () => readonly TelemetryRecord[];
};

export function createRingBufferSink(): RingBufferSink {
  const buffer: TelemetryRecord[] = [];
  let writeCursor = 0;
  let wrapped = false;

  function write(record: TelemetryRecord): void {
    buffer[writeCursor] = record;
    writeCursor += 1;
    if (writeCursor >= RING_BUFFER_CAPACITY) {
      writeCursor = 0;
      wrapped = true;
    }
  }

  function read(): readonly TelemetryRecord[] {
    if (!wrapped) return buffer.slice(0, writeCursor);
    return [...buffer.slice(writeCursor), ...buffer.slice(0, writeCursor)];
  }

  return { write, read };
}
