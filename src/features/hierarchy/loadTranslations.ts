import { createLoadTranslations, Locale } from '@platform/internationalization';

export const loadTranslations = createLoadTranslations('hierarchy', {
  [Locale.English]: () => import('./locales/en/hierarchy.json'),
});
