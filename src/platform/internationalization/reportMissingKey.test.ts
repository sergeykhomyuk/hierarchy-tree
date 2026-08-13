import { describe, expect, it, vi } from 'vitest';
import { createMissingKeyHandler, missingKeyReports } from './reportMissingKey';

describe('createMissingKeyHandler', () => {
  it('reports through the facade and records the report for the test-mode collector', () => {
    const error = vi.fn();
    const handler = createMissingKeyHandler({ logger: { error } });

    handler(['en'], 'common', 'login.submit', 'login.submit', false, {});

    expect(error).toHaveBeenCalledWith('i18n.missing_key', {
      namespace: 'common',
      key: 'login.submit',
    });
    expect(missingKeyReports).toEqual([
      { namespace: 'common', key: 'login.submit' },
    ]);

    missingKeyReports.length = 0;
  });
});
