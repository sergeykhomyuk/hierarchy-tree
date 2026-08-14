import { describe, expect, it } from 'vitest';
import { createSystemRandomness } from './createSystemRandomness';

describe('createSystemRandomness', () => {
  it('nextUnitInterval returns a value in [0, 1)', () => {
    const randomness = createSystemRandomness();

    for (let index = 0; index < 20; index += 1) {
      const value = randomness.nextUnitInterval();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('nextBytes returns the requested number of bytes', () => {
    const randomness = createSystemRandomness();

    expect(randomness.nextBytes(16)).toHaveLength(16);
    expect(randomness.nextBytes(8)).toHaveLength(8);
  });

  it('nextBytes varies across calls', () => {
    const randomness = createSystemRandomness();

    const first = randomness.nextBytes(16);
    const second = randomness.nextBytes(16);

    expect(first).not.toEqual(second);
  });
});
