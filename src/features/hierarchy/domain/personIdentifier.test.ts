import { describe, expect, it } from 'vitest';
import { parsePersonIdentifier } from './personIdentifier';

describe('parsePersonIdentifier', () => {
  it('accepts a safe positive integer and rejects everything else', () => {
    expect(parsePersonIdentifier(42)).toBe(42);
    expect(parsePersonIdentifier(1)).toBe(1);

    expect(() => parsePersonIdentifier(0)).toThrow(RangeError);
    expect(() => parsePersonIdentifier(-1)).toThrow(RangeError);
    expect(() => parsePersonIdentifier(1.5)).toThrow(RangeError);
    expect(() => parsePersonIdentifier(Number.MAX_SAFE_INTEGER + 1)).toThrow(
      RangeError,
    );
    expect(() => parsePersonIdentifier(NaN)).toThrow(RangeError);
    expect(() => parsePersonIdentifier(Infinity)).toThrow(RangeError);
    expect(() => parsePersonIdentifier('42')).toThrow(RangeError);
    expect(() => parsePersonIdentifier(null)).toThrow(RangeError);
    expect(() => parsePersonIdentifier(undefined)).toThrow(RangeError);
  });
});
