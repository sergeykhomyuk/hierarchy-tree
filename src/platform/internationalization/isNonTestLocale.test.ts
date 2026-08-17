import { describe, expect, it } from 'vitest';
import { isNonTestLocale } from './isNonTestLocale';
import { Locale } from './locale';

describe('isNonTestLocale', () => {
  it('is true for Locale.English', () => {
    expect(isNonTestLocale(Locale.English)).toBe(true);
  });

  it('is false for Locale.Test', () => {
    expect(isNonTestLocale(Locale.Test)).toBe(false);
  });
});
