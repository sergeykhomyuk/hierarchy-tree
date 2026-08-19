import { afterEach, describe, expect, it } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { createTabStorage } from '@platform/runtime';
import { bootstrap } from './bootstrap';
import type { ConfigurationResult } from '@platform/configuration';

// The real session storage key and shape (session/sessionRecord.ts,
// sessionStorageKey.ts), not reachable from app/ through the feature
// barrel - bootstrap.ts drives the real router end to end, and / is a
// guarded route since M3, so these tests need a real signed-in session
// to reach it at all. Written through createTabStorage() - the one
// sanctioned sessionStorage reader/writer - rather than the global
// directly, which lint bans everywhere else (invariant 78).
const SESSION_STORAGE_KEY = 'hierarchy-tree.session';

function writeSignedInSession(): void {
  createTabStorage().write(
    SESSION_STORAGE_KEY,
    JSON.stringify({ version: 1, userId: 'bootstrap-test-user' }),
  );
}

afterEach(() => {
  createTabStorage().remove(SESSION_STORAGE_KEY);
});

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
  it('renders the home route through the real router when configuration is valid', async () => {
    writeSignedInSession();
    const container = document.createElement('div');
    document.body.appendChild(container);

    await act(async () => {
      await bootstrap(container, VALID_CONFIGURATION_RESULT);
    });

    // header.pageTitle rather than anything the hierarchy fetch itself
    // produces: this environment has no real network route to
    // apiBaseUrl, so the fetch's own outcome (loading, data or error) is
    // not what these tests are proving - the header renders regardless,
    // and its presence is what shows the real router (not the startup
    // placeholder) rendered the home route.
    await waitFor(() => {
      expect(container.textContent).toContain('Hierarchy Tree');
    });
    // eslint-disable-next-line testing-library/no-node-access -- this container is created and rendered into directly (bootstrap owns createRoot), not returned from RTL's render().
    const startupPlaceholder = container.querySelector(
      '[data-testid="startup-placeholder"]',
    );
    expect(startupPlaceholder).toBeNull();

    document.body.removeChild(container);
  });

  it('attaches the interaction tracker to the router so a settled navigation is recorded', async () => {
    writeSignedInSession();
    const container = document.createElement('div');
    document.body.appendChild(container);

    await act(async () => {
      await bootstrap(container, {
        ok: true,
        configuration: Object.freeze({
          ...VALID_CONFIGURATION_RESULT.configuration,
          observabilitySink: 'buffer',
          telemetryBufferHandle: true,
        }),
      });
    });

    // header.pageTitle rather than anything the hierarchy fetch itself
    // produces: this environment has no real network route to
    // apiBaseUrl, so the fetch's own outcome (loading, data or error) is
    // not what these tests are proving - the header renders regardless,
    // and its presence is what shows the real router (not the startup
    // placeholder) rendered the home route.
    await waitFor(() => {
      expect(container.textContent).toContain('Hierarchy Tree');
    });

    const records = globalThis.__hierarchyTreeTelemetry?.read() ?? [];
    const routeViewed = records.filter(
      (record) =>
        record.kind === 'analytics' && record.name === 'app.route_viewed',
    );
    expect(routeViewed).toHaveLength(1);

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
