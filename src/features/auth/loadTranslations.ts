import { createLoadTranslations, Locale } from '@platform/internationalization';
import { AUTH_TRANSLATION_NAMESPACE } from './translationNamespace';

export const loadTranslations = createLoadTranslations(
  AUTH_TRANSLATION_NAMESPACE,
  {
    [Locale.English]: () => import('./locales/en/auth.json'),
  },
);
