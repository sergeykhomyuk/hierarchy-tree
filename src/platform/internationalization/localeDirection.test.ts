import { afterEach, describe, expect, it, vi } from 'vitest';
import { localeDirection } from './localeDirection';

describe('localeDirection', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('the locale direction map resolves without Intl.Locale', () => {
    vi.stubGlobal('Intl', {
      ...Intl,
      Locale: class {
        constructor() {
          throw new Error('Intl.Locale must not be used by localeDirection');
        }
      },
    });

    expect(localeDirection('ar')).toBe('rtl');
    expect(localeDirection('en')).toBe('ltr');
  });

  it('resolves a right-to-left subtag regardless of region', () => {
    expect(localeDirection('he')).toBe('rtl');
    expect(localeDirection('ar-EG')).toBe('rtl');
    expect(localeDirection('fa-IR')).toBe('rtl');
  });

  it('defaults to ltr for an unrecognized or malformed language tag', () => {
    expect(localeDirection('en-US')).toBe('ltr');
    expect(localeDirection('')).toBe('ltr');
  });
});
