import type { Catalogue } from './catalogue';
import { createKeyEchoCatalogue } from './createKeyEchoCatalogue';
import type { NonTestLocaleRecord } from './nonTestLocaleRecord';
import { resolveByLocale } from './resolveByLocale';

// createInternationalization needs the common catalogue synchronously, as
// part of its own init() call - unlike a feature namespace's own catalogue
// (createLoadTranslations), which registers lazily after the instance
// already exists.
export function resolveLocaleCatalogue(
  language: string,
  catalogues: NonTestLocaleRecord<Catalogue>,
): Catalogue {
  return resolveByLocale(language, catalogues, createKeyEchoCatalogue);
}
