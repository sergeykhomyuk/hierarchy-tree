import { describe, expect, it, vi } from 'vitest';
import { createInternationalization } from './createInternationalization';
import { missingKeyReports } from './reportMissingKey';

describe('createInternationalization', () => {
  it('resolves a known key from the common catalogue', async () => {
    const observability = { logger: { error: vi.fn() } };
    const instance = await createInternationalization({
      resources: { common: { greeting: 'hello' } },
      language: 'en',
      observability,
    });

    expect(instance.t('greeting')).toBe('hello');
  });

  it('a missing key reports through the facade and renders the visible marker', async () => {
    const error = vi.fn();
    const observability = { logger: { error } };
    const instance = await createInternationalization({
      resources: { common: {} },
      language: 'en',
      observability,
    });

    const rendered = instance.t('login.submit');

    expect(rendered).toBe('⟦common:login.submit⟧');
    expect(error).toHaveBeenCalledWith('i18n.missing_key', {
      namespace: 'common',
      key: 'login.submit',
    });
    expect(missingKeyReports).toEqual([
      { namespace: 'common', key: 'login.submit' },
    ]);

    missingKeyReports.length = 0;
  });

  it('does not fall back to a different language', async () => {
    const observability = { logger: { error: vi.fn() } };
    const instance = await createInternationalization({
      resources: { common: {} },
      language: 'en',
      observability,
    });

    expect(instance.options.fallbackLng).toBe(false);
    missingKeyReports.length = 0;
  });
});
