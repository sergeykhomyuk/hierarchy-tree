import type { i18n } from 'i18next';

// A module-level promise, not a per-call one: two navigations to /login
// register the auth namespace once rather than racing two dynamic
// imports (invariant 62).
let pendingRegistration: Promise<void> | null = null;

export function loadTranslations(instance: i18n): Promise<void> {
  pendingRegistration ??= registerCatalogue(instance);
  return pendingRegistration;
}

async function registerCatalogue(instance: i18n): Promise<void> {
  const catalogue = await import('./locales/en/auth.json');
  instance.addResourceBundle('en', 'auth', catalogue.default);
}
