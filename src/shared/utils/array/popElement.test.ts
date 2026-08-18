import { describe, expect, it } from 'vitest';
import { popElement } from './popElement';

describe('popElement', () => {
  it('pops the last element from a non-empty array', () => {
    const stack = [1, 2, 3];

    expect(popElement(stack)).toBe(3);
    expect(stack).toEqual([1, 2]);
  });

  it('throws when the array is empty', () => {
    expect(() => popElement([])).toThrow(RangeError);
  });
});
