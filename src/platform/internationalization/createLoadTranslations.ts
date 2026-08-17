import type { i18n } from 'i18next';
import type { Catalogue } from './catalogue';
import { createKeyEchoCatalogue } from './createKeyEchoCatalogue';
import type { NonTestLocaleRecord } from './nonTestLocaleRecord';
import { resolveByLocale } from './resolveByLocale';

type CatalogueLoader = () => Promise<{ default: Catalogue }>;

// Each loader must stay a literal `import('./locales/...')` at its call
// site in the feature's own module - Rollup only splits a dynamic import
// into its own chunk when the specifier is a literal there, not when it is
// passed through as a runtime value (build-output/catalogue-chunks.test.ts
// guards this).
type CatalogueLoaders = NonTestLocaleRecord<CatalogueLoader>;

export function createLoadTranslations(
  namespace: string,
  loaders: CatalogueLoaders,
): (instance: i18n) => Promise<void> {
  // Keyed by instance rather than a single module-level promise: two
  // navigations to the same route on the SAME instance register the
  // namespace once rather than racing two dynamic imports (invariant 62),
  // while a second i18n instance (a second app bootstrap, as happens across
  // tests in one file) still gets its own registration instead of silently
  // inheriting the first instance's already-resolved promise.
  const pendingRegistrations = new WeakMap<i18n, Promise<void>>();

  return function loadTranslations(instance: i18n): Promise<void> {
    const existing = pendingRegistrations.get(instance);
    if (existing) return existing;

    const pending = registerCatalogue(instance);
    pendingRegistrations.set(instance, pending);
    return pending;
  };

  async function registerCatalogue(instance: i18n): Promise<void> {
    // Read instance.language once, up front - it can change while a
    // loader's import() is in flight, and the loader selection and the
    // addResourceBundle call below have to agree on the same value.
    const language = instance.language;
    const loadCatalogue = resolveByLocale(language, loaders, loadTest);
    const catalogue = await loadCatalogue();
    instance.addResourceBundle(language, namespace, catalogue.default);
  }
}

function loadTest(loader: CatalogueLoader): CatalogueLoader {
  return async () => ({
    default: createKeyEchoCatalogue((await loader()).default),
  });
}
