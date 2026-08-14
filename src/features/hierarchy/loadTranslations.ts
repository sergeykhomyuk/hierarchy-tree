import type { i18n } from 'i18next';
import { createKeyEchoCatalogue, Locale } from '@platform/internationalization';

// Keyed by instance rather than a single module-level promise: two
// navigations to / on the SAME instance register the hierarchy namespace
// once rather than racing two dynamic imports (invariant 62), while a
// second i18n instance (a second app bootstrap, as happens across tests
// in one file) still gets its own registration instead of silently
// inheriting the first instance's already-resolved promise.
const pendingRegistrations = new WeakMap<i18n, Promise<void>>();

export function loadTranslations(instance: i18n): Promise<void> {
  const existing = pendingRegistrations.get(instance);
  if (existing) return existing;

  const pending = registerCatalogue(instance);
  pendingRegistrations.set(instance, pending);
  return pending;
}

async function registerCatalogue(instance: i18n): Promise<void> {
  const catalogue = await import('./locales/en/hierarchy.json');
  const resource =
    instance.language === Locale.Test
      ? createKeyEchoCatalogue(catalogue.default)
      : catalogue.default;
  instance.addResourceBundle(instance.language, 'hierarchy', resource);
}
