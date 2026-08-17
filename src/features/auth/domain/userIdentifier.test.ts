import { describe, expect, it } from 'vitest';
import { userIdentifier } from './userIdentifier';

describe('userIdentifier', () => {
  it('accepts a finite integer and a conservative string alike', () => {
    expect(userIdentifier(42)).toBe(42);
    expect(userIdentifier('user_42-A')).toBe('user_42-A');
  });

  it('rejects a traversal, a slash, a query character and a fragment character', () => {
    expect(() => userIdentifier('../secrets')).toThrow(RangeError);
    expect(() => userIdentifier('a/b')).toThrow(RangeError);
    expect(() => userIdentifier('a?b')).toThrow(RangeError);
    expect(() => userIdentifier('a#b')).toThrow(RangeError);
  });

  it('rejects a non-finite or fractional number', () => {
    expect(() => userIdentifier(Infinity)).toThrow(RangeError);
    expect(() => userIdentifier(NaN)).toThrow(RangeError);
    expect(() => userIdentifier(1.5)).toThrow(RangeError);
  });
});
