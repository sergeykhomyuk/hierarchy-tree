import { describe, expect, it } from 'vitest';
import { Locale } from './locale';
import { resolveLocaleCatalogue } from './resolveLocaleCatalogue';

describe('resolveLocaleCatalogue', () => {
  it('returns the English catalogue unmodified for an English language', () => {
    const resolved = resolveLocaleCatalogue(Locale.English, {
      [Locale.English]: { greeting: 'hello' },
    });

    expect(resolved).toEqual({ greeting: 'hello' });
  });

  it('echo-derives Locale.Test from the English catalogue', () => {
    const resolved = resolveLocaleCatalogue(Locale.Test, {
      [Locale.English]: { greeting: 'hello' },
    });

    expect(resolved).toEqual({ greeting: 'greeting' });
  });
});
