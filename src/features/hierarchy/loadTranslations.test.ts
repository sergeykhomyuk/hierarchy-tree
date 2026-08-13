import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInternationalization } from '@platform/internationalization';

async function createTestI18n() {
  return createInternationalization({
    resources: { common: {} },
    language: 'en',
    observability: { logger: { error: vi.fn() } },
  });
}

describe('hierarchy loadTranslations', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('registers only the hierarchy namespace', async () => {
    const { loadTranslations } = await import('./loadTranslations');
    const instance = await createTestI18n();

    await loadTranslations(instance);

    expect(instance.hasResourceBundle('en', 'hierarchy')).toBe(true);
    expect(instance.hasResourceBundle('en', 'auth')).toBe(false);
  });

  it('dedupes concurrent calls behind a single registration', async () => {
    const { loadTranslations } = await import('./loadTranslations');
    const instance = await createTestI18n();
    const addResourceBundleSpy = vi.spyOn(instance, 'addResourceBundle');

    await Promise.all([loadTranslations(instance), loadTranslations(instance)]);

    expect(addResourceBundleSpy).toHaveBeenCalledTimes(1);
  });
});
