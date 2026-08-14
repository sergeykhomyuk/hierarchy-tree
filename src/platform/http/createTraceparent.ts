import type { Randomness } from '@platform/runtime';

const VERSION = '00';
const FLAGS = '01';
const SPAN_ID_BYTE_LENGTH = 8;

export function createTraceparent(
  traceId: string,
  randomness: Randomness,
): string {
  const spanId = bytesToHex(randomness.nextBytes(SPAN_ID_BYTE_LENGTH));
  return `${VERSION}-${traceId}-${spanId}-${FLAGS}`;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}
