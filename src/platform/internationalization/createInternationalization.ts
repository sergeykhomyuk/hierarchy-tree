import { createInstance, type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { ObservabilityFacade } from '@platform/observability';
import { COMMON_TRANSLATION_NAMESPACE } from './commonTranslationNamespace';
import { formatMissingKey } from './formatMissingKey';
import { createMissingKeyHandler } from './reportMissingKey';

export type InternationalizationDependencies = {
  resources: Record<
    typeof COMMON_TRANSLATION_NAMESPACE,
    Record<string, unknown>
  >;
  language: string;
  observability: { logger: Pick<ObservabilityFacade['logger'], 'error'> };
};

export async function createInternationalization(
  dependencies: InternationalizationDependencies,
): Promise<i18n> {
  const instance = createInstance();
  await instance.use(initReactI18next).init({
    lng: dependencies.language,
    fallbackLng: false,
    defaultNS: COMMON_TRANSLATION_NAMESPACE,
    ns: [COMMON_TRANSLATION_NAMESPACE],
    resources: {
      [dependencies.language]: {
        [COMMON_TRANSLATION_NAMESPACE]:
          dependencies.resources[COMMON_TRANSLATION_NAMESPACE],
      },
    },
    interpolation: { escapeValue: false },
    returnNull: false,
    saveMissing: true,
    // Prefixes only the key parseMissingKeyHandler receives, not
    // missingKeyHandler's - i18next passes namespace as its own argument
    // there regardless, so the logged report stays clean while the
    // rendered marker becomes the invariant-63 `namespace:key` format.
    appendNamespaceToMissingKey: true,
    missingKeyHandler: createMissingKeyHandler(dependencies.observability),
    parseMissingKeyHandler: formatMissingKey,
    react: { useSuspense: false },
  });
  return instance;
}
