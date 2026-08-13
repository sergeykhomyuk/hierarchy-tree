import { describe, expect, it } from 'vitest';
import { act } from 'react';
import { bootstrap } from './bootstrap';
import type { ConfigurationResult } from '@platform/configuration';

const VALID_CONFIGURATION_RESULT: ConfigurationResult = {
  ok: true,
  configuration: Object.freeze({
    apiBaseUrl: 'https://gongfetest.firebaseio.com',
    logLevel: 'debug',
    observabilitySink: 'console',
    requestTimeoutMilliseconds: 8000,
    telemetryBufferHandle: true,
    developmentRoutes: true,
    basePath: '/',
  }),
};

describe('bootstrap', () => {
  it('the startup placeholder renders through bootstrap', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    act(() => {
      bootstrap(container, VALID_CONFIGURATION_RESULT);
    });

    expect(
      container.querySelector('[data-testid="startup-placeholder"]'),
    ).not.toBeNull();

    document.body.removeChild(container);
  });

  it('an invalid environment renders the error screen and does not render the router', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    act(() => {
      bootstrap(container, { ok: false, invalidKeys: ['VITE_API_BASE_URL'] });
    });

    // No router exists yet in this milestone (M5) - the substitute claim
    // is that neither the error screen and the normal startup content are
    // both present, since exactly one of the two is what "renders the
    // error screen instead" means.
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(
      container.querySelector('[data-testid="startup-placeholder"]'),
    ).toBeNull();
    expect(container.textContent).toContain('VITE_API_BASE_URL');

    document.body.removeChild(container);
  });
});
