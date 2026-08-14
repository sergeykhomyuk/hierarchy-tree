import type { Randomness } from '@platform/runtime';

const CORRELATION_ID_BYTE_LENGTH = 16;

export type CorrelationId = string;

export function createCorrelationId(randomness: Randomness): CorrelationId {
  return bytesToHex(randomness.nextBytes(CORRELATION_ID_BYTE_LENGTH));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}
