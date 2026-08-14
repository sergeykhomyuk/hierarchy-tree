import type { Randomness } from '@platform/runtime';
import { bytesToHex } from '@shared/utils';

const CORRELATION_ID_BYTE_LENGTH = 16;

export type CorrelationId = string;

export function createCorrelationId(randomness: Randomness): CorrelationId {
  return bytesToHex(randomness.nextBytes(CORRELATION_ID_BYTE_LENGTH));
}
