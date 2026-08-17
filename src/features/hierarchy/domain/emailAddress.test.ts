import { describe, expect, it } from 'vitest';
import { parseEmailAddress } from './emailAddress';

describe('parseEmailAddress', () => {
  it('brands a non-empty string and rejects a non-string', () => {
    expect(parseEmailAddress('justin@example.com')).toBe(
      'justin@example.com',
    );

    expect(() => parseEmailAddress(42)).toThrow(TypeError);
    expect(() => parseEmailAddress(null)).toThrow(TypeError);
    expect(() => parseEmailAddress(undefined)).toThrow(TypeError);
    expect(() => parseEmailAddress(true)).toThrow(TypeError);
  });
});
