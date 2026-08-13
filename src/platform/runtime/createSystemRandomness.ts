import type { Randomness } from './randomness';

const UINT32_RANGE = 0xffffffff + 1;

export function createSystemRandomness(): Randomness {
  return {
    nextUnitInterval(): number {
      const value = crypto.getRandomValues(new Uint32Array(1)).at(0) ?? 0;
      return value / UINT32_RANGE;
    },
    nextBytes(length: number): Uint8Array {
      return crypto.getRandomValues(new Uint8Array(length));
    },
  };
}
