import { createLoadTranslations, Locale } from '@platform/internationalization';
import { HIERARCHY_TRANSLATION_NAMESPACE } from './translationNamespace';

export const loadTranslations = createLoadTranslations(
  HIERARCHY_TRANSLATION_NAMESPACE,
  {
    [Locale.English]: () => import('./locales/en/hierarchy.json'),
  },
);
