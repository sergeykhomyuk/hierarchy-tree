import { describe, expect, it } from 'vitest';
import { lookupResultSchema } from './lookupResultSchema';

describe('lookupResultSchema', () => {
  it('reads a null body as no match', () => {
    expect(lookupResultSchema.safeParse(null).success).toBe(true);
  });

  it('reads a string and a number id as the same identifier', () => {
    expect(lookupResultSchema.safeParse('user_42-A').success).toBe(true);
    expect(lookupResultSchema.safeParse(42).success).toBe(true);
  });

  it('rejects an object, an array, an empty string, a boolean and a fractional number', () => {
    expect(lookupResultSchema.safeParse({}).success).toBe(false);
    expect(lookupResultSchema.safeParse([]).success).toBe(false);
    expect(lookupResultSchema.safeParse('').success).toBe(false);
    expect(lookupResultSchema.safeParse(true).success).toBe(false);
    expect(lookupResultSchema.safeParse(1.5).success).toBe(false);
  });
});
