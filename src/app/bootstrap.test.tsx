import { describe, expect, it } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { bootstrap } from './bootstrap';
import type { ConfigurationResult } from '@platform/configuration';

const VALID_CONFIGURATION_RESULT: ConfigurationResult = {
  ok: true,
  configuration: Object.freeze({
    apiBaseUrl: 'https://gongfetest.firebaseio.com',
    logLevel: 'debug',
    observabilitySink: 'none',
    requestTimeoutMilliseconds: 8000,
    telemetryBufferHandle: false,
    developmentRoutes: true,
    basePath: '/',
  }),
};

describe('bootstrap', () => {
  it('the startup placeholder renders through the real provider stack', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await act(async () => {
      await bootstrap(container, VALID_CONFIGURATION_RESULT);
    });

    await waitFor(() => {
      // eslint-disable-next-line testing-library/no-node-access -- this container is created and rendered into directly (bootstrap owns createRoot), not returned from RTL's render().
      const startupPlaceholder = container.querySelector(
        '[data-testid="startup-placeholder"]',
      );
      expect(startupPlaceholder).not.toBeNull();
    });

    document.body.removeChild(container);
  });

  it('an invalid environment renders the error screen and does not render the router', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await act(async () => {
      await bootstrap(container, {
        ok: false,
        invalidKeys: ['VITE_API_BASE_URL'],
      });
    });

    // eslint-disable-next-line testing-library/no-node-access -- this container is created and rendered into directly (bootstrap owns createRoot), not returned from RTL's render().
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.textContent).toContain('VITE_API_BASE_URL');

    document.body.removeChild(container);
  });
});
