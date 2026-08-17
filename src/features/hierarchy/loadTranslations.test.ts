import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createInternationalization,
  Locale,
} from '@platform/internationalization';
import hierarchyCatalogue from './locales/en/hierarchy.json';

async function createTestI18n(language: string = Locale.English) {
  return createInternationalization({
    resources: { common: {} },
    language,
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

  it('registers the key-echoed catalogue under Locale.Test', async () => {
    const { loadTranslations } = await import('./loadTranslations');
    const englishSnapshot = JSON.parse(
      JSON.stringify(hierarchyCatalogue),
    ) as unknown;

    const englishInstance = await createTestI18n(Locale.English);
    await loadTranslations(englishInstance);
    expect(
      englishInstance.getResourceBundle(Locale.English, 'hierarchy'),
    ).toEqual(hierarchyCatalogue);

    const testInstance = await createTestI18n(Locale.Test);
    await loadTranslations(testInstance);
    expect(testInstance.getResourceBundle(Locale.Test, 'hierarchy')).toEqual({
      page: {
        documentTitle: 'page.documentTitle',
        cardTitle: 'page.cardTitle',
        loadingLabel: 'page.loadingLabel',
        errorHeading: 'page.errorHeading',
        errorBody: 'page.errorBody',
        retryLabel: 'page.retryLabel',
        backToLoginLabel: 'page.backToLoginLabel',
        emptyHeading: 'page.emptyHeading',
        emptyBody: 'page.emptyBody',
        refreshLabel: 'page.refreshLabel',
        summary: 'page.summary',
        youMarkerLabel: 'page.youMarkerLabel',
        reports_one: 'page.reports_one',
        reports_other: 'page.reports_other',
        hidden_one: 'page.hidden_one',
        hidden_other: 'page.hidden_other',
        toggleAnnouncedExpanded: 'page.toggleAnnouncedExpanded',
        toggleAnnouncedCollapsed: 'page.toggleAnnouncedCollapsed',
      },
    });

    const secondEnglishInstance = await createTestI18n(Locale.English);
    await loadTranslations(secondEnglishInstance);
    expect(
      secondEnglishInstance.getResourceBundle(Locale.English, 'hierarchy'),
    ).toEqual(hierarchyCatalogue);

    // G1/Codex-2: the source catalogue module is shared and cached across
    // every dynamic import above - none of the three registrations may
    // mutate it.
    expect(hierarchyCatalogue).toEqual(englishSnapshot);
  });
});
