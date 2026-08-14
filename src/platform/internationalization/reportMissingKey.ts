import type { ObservabilityFacade } from '@platform/observability';

export type MissingKeyEntry = { namespace: string; key: string };

// Cleared in vitest.setup.ts's beforeEach and asserted empty in its
// afterEach, so any rendered surface requesting a nonexistent key fails
// the suite (invariant 63) rather than only the i18n-specific tests that
// deliberately clear it back out after asserting on it.
export const missingKeyReports: MissingKeyEntry[] = [];

export function createMissingKeyHandler(observability: {
  logger: Pick<ObservabilityFacade['logger'], 'error'>;
}): (
  languages: readonly string[],
  namespace: string,
  key: string,
  fallbackValue: string,
  updateMissing: boolean,
  options: unknown,
) => void {
  return (_languages, namespace, key) => {
    observability.logger.error('i18n.missing_key', { namespace, key });
    missingKeyReports.push({ namespace, key });
  };
}
