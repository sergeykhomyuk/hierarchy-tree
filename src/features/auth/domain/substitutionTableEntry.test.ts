import { describe, expect, it } from 'vitest';
import { substitutionTableEntry } from './substitutionTableEntry';

describe('substitutionTableEntry', () => {
  it('returns the entry at a valid index', () => {
    expect(substitutionTableEntry([10, 20, 30], 1)).toBe(20);
  });

  it('throws a RangeError for an index outside the table', () => {
    expect(() => substitutionTableEntry([10, 20, 30], 3)).toThrow(RangeError);
  });
});
