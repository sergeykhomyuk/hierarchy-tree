import { describe, expect, it } from 'vitest';
import { detectLocale } from './detectLocale';
import { Locale } from './locale';

describe('detectLocale', () => {
  it('matches a region-qualified candidate to its base subtag', () => {
    expect(detectLocale(['en-US'])).toBe(Locale.English);
    expect(detectLocale(['EN-GB'])).toBe(Locale.English);
  });

  it('falls back to English when no candidate matches', () => {
    expect(detectLocale([])).toBe(Locale.English);
    expect(detectLocale(['fr-FR', 'de-DE'])).toBe(Locale.English);
    expect(detectLocale([''])).toBe(Locale.English);
    expect(detectLocale(['-zxx'])).toBe(Locale.English);
  });

  it('respects preference order over match order', () => {
    expect(detectLocale(['fr-FR', 'zxx', 'en'])).toBe(Locale.Test);
  });

  it('matches an exact-subtag candidate with no region', () => {
    expect(detectLocale(['zxx'])).toBe(Locale.Test);
  });
});
