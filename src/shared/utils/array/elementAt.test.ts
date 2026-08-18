import { describe, expect, it } from 'vitest';
import { elementAt } from './elementAt';

describe('elementAt', () => {
  it('returns the element at a valid index', () => {
    expect(elementAt(['a', 'b', 'c'], 1)).toBe('b');
  });

  it('throws when the index is out of bounds', () => {
    expect(() => elementAt(['a', 'b', 'c'], 3)).toThrow(RangeError);
  });
});
