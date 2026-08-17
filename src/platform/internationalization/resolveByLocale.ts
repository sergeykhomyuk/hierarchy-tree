import { isNonTestLocale } from './isNonTestLocale';
import { Locale } from './locale';
import type { NonTestLocaleRecord } from './nonTestLocaleRecord';

// The one language-dispatch rule shared by createLoadTranslations (async
// loaders) and resolveLocaleCatalogue (already-resolved catalogues):
// Locale.Test always borrows Locale.English's entry through deriveTest,
// every other language uses its own entry directly. isNonTestLocale is the
// narrowing step that lets a plain i18next language string index a
// NonTestLocaleRecord at all.
export function resolveByLocale<TValue>(
  language: string,
  values: NonTestLocaleRecord<TValue>,
  deriveTest: (value: TValue) => TValue,
): TValue {
  if (isNonTestLocale(language)) {
    return values[language];
  }
  return deriveTest(values[Locale.English]);
}
