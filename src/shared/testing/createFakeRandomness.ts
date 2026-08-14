import type { Randomness } from '@platform/runtime';

export function createFakeRandomness(
  unitIntervals: readonly number[] = [0],
): Randomness {
  let unitIntervalIndex = 0;
  let byteSeed = 0;

  return {
    nextUnitInterval(): number {
      const value =
        unitIntervals[unitIntervalIndex % unitIntervals.length] ?? 0;
      unitIntervalIndex += 1;
      return value;
    },
    nextBytes(length: number): Uint8Array {
      const bytes = new Uint8Array(length);
      for (let index = 0; index < length; index += 1) {
        bytes[index] = (byteSeed + index) % 256;
      }
      byteSeed += 1;
      return bytes;
    },
  };
}
