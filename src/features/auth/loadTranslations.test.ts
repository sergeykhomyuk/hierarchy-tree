import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createInternationalization,
  Locale,
} from '@platform/internationalization';
import authCatalogue from './locales/en/auth.json';

async function createTestI18n(language: string = Locale.English) {
  return createInternationalization({
    resources: { common: {} },
    language,
    observability: { logger: { error: vi.fn() } },
  });
}

describe('auth loadTranslations', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('registers only the auth namespace', async () => {
    const { loadTranslations } = await import('./loadTranslations');
    const instance = await createTestI18n();

    await loadTranslations(instance);

    expect(instance.hasResourceBundle('en', 'auth')).toBe(true);
    expect(instance.hasResourceBundle('en', 'hierarchy')).toBe(false);
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
      JSON.stringify(authCatalogue),
    ) as unknown;

    const englishInstance = await createTestI18n(Locale.English);
    await loadTranslations(englishInstance);
    expect(englishInstance.getResourceBundle(Locale.English, 'auth')).toEqual(
      authCatalogue,
    );

    const testInstance = await createTestI18n(Locale.Test);
    await loadTranslations(testInstance);
    expect(testInstance.getResourceBundle(Locale.Test, 'auth')).toEqual({
      login: {
        documentTitle: 'login.documentTitle',
        wordmark: 'login.wordmark',
        heading: 'login.heading',
        subtext: 'login.subtext',
        emailLabel: 'login.emailLabel',
        emailPlaceholder: 'login.emailPlaceholder',
        passwordLabel: 'login.passwordLabel',
        footerNote: 'login.footerNote',
        footerNoteSubmitting: 'login.footerNoteSubmitting',
        submit: 'login.submit',
        submitting: 'login.submitting',
        noMatchMessage: 'login.noMatchMessage',
        serviceProblemMessage: 'login.serviceProblemMessage',
        serviceProblemCorrelationLabel: 'login.serviceProblemCorrelationLabel',
        retry: 'login.retry',
      },
    });

    const secondEnglishInstance = await createTestI18n(Locale.English);
    await loadTranslations(secondEnglishInstance);
    expect(
      secondEnglishInstance.getResourceBundle(Locale.English, 'auth'),
    ).toEqual(authCatalogue);

    // G1/Codex-2: the source catalogue module is shared and cached across
    // every dynamic import above - none of the three registrations may
    // mutate it.
    expect(authCatalogue).toEqual(englishSnapshot);
  });

  it('registers every key the login card renders', () => {
    // TECH.md section 8's enumerated list - every one is a surface
    // invariant 116 requires to come from a catalogue.
    const expectedKeys = [
      'documentTitle',
      'wordmark',
      'heading',
      'subtext',
      'emailLabel',
      'emailPlaceholder',
      'passwordLabel',
      'footerNote',
      'footerNoteSubmitting',
      'submit',
      'submitting',
      'noMatchMessage',
      'serviceProblemMessage',
      'serviceProblemCorrelationLabel',
      'retry',
    ];

    expect(Object.keys(authCatalogue.login).sort()).toEqual(
      [...expectedKeys].sort(),
    );
  });
});
