import { describe, expect, it } from 'vitest';
import { rowAccessibleName } from './rowAccessibleName';

describe('rowAccessibleName', () => {
  it("appends the you marker only for the signed-in user's row", () => {
    expect(rowAccessibleName('Ronnen Gurevitch', false, 'you')).toBe(
      'Ronnen Gurevitch',
    );
    expect(rowAccessibleName('Ronnen Gurevitch', true, 'you')).toBe(
      'Ronnen Gurevitch, you',
    );
  });
});
