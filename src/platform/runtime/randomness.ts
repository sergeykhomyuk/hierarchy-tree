export type Randomness = {
  nextUnitInterval(): number;
  nextBytes(length: number): Uint8Array;
};
