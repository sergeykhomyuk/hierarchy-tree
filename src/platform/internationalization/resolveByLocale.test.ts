import { describe, expect, it } from 'vitest';
import { Locale } from './locale';
import { resolveByLocale } from './resolveByLocale';

describe('resolveByLocale', () => {
  it("returns the matching language's own value, untouched by deriveTest", () => {
    const deriveTest = () => 'should not be called';

    const value = resolveByLocale(
      Locale.English,
      { [Locale.English]: 'english value' },
      deriveTest,
    );

    expect(value).toBe('english value');
  });

  it("derives Locale.Test's value from the English entry via deriveTest", () => {
    const value = resolveByLocale(
      Locale.Test,
      { [Locale.English]: 'english value' },
      (englishValue) => `derived from ${englishValue}`,
    );

    expect(value).toBe('derived from english value');
  });
});
