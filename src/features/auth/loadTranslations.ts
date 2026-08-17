import { createLoadTranslations, Locale } from '@platform/internationalization';

export const loadTranslations = createLoadTranslations('auth', {
  [Locale.English]: () => import('./locales/en/auth.json'),
});
