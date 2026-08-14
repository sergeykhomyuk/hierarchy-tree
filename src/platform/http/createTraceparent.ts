import type { Randomness } from '@platform/runtime';
import { bytesToHex } from '@shared/utils';

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
