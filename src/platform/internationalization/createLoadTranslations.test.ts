import { describe, expect, it, vi } from 'vitest';
import { createInternationalization } from './createInternationalization';
import { createLoadTranslations } from './createLoadTranslations';
import { Locale } from './locale';

async function createTestI18n(language: string) {
  return createInternationalization({
    resources: { common: {} },
    language,
    observability: { logger: { error: vi.fn() } },
  });
}

describe('createLoadTranslations', () => {
  it('registers the English catalogue for an English instance, unmodified', async () => {
    const loadTranslations = createLoadTranslations('fixture', {
      [Locale.English]: () =>
        Promise.resolve({ default: { greeting: 'hello' } }),
    });
    const instance = await createTestI18n(Locale.English);

    await loadTranslations(instance);

    expect(instance.getResourceBundle(Locale.English, 'fixture')).toEqual({
      greeting: 'hello',
    });
  });

  it('echo-derives Locale.Test from the English loader', async () => {
    const loadTranslations = createLoadTranslations('fixture', {
      [Locale.English]: () =>
        Promise.resolve({ default: { greeting: 'hello' } }),
    });
    const instance = await createTestI18n(Locale.Test);

    await loadTranslations(instance);

    expect(instance.getResourceBundle(Locale.Test, 'fixture')).toEqual({
      greeting: 'greeting',
    });
  });
});
