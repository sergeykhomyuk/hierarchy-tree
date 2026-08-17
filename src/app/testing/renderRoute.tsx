import type { ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import type { Configuration } from '@platform/configuration';
import type { Clock, KeyValueStorage } from '@platform/runtime';
import type { Transport } from '@platform/http';
import { createObservability } from '@platform/observability';
import {
  createInternationalization,
  createKeyEchoCatalogue,
  Locale,
} from '@platform/internationalization';
import { createHttpClient } from '@platform/http';
import { createSignedInUserStore } from '@features/auth';
import {
  createFakeClock,
  createFakeRandomness,
  createFakeTransport,
} from '@shared/testing';
import { ApplicationRoot } from '../ApplicationRoot';
import { createInteractionTracker } from '../routing';
import type { Runtime } from '../composition';
import commonCatalogue from '../locales/en/common.json';

function createFakeTabStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    read: (key) => map.get(key) ?? null,
    write: (key, value) => {
      map.set(key, value);
      return true;
    },
    remove: (key) => {
      map.delete(key);
    },
  };
}

const TEST_CONFIGURATION: Configuration = Object.freeze({
  apiBaseUrl: 'https://example.test',
  logLevel: 'silent',
  observabilitySink: 'none',
  requestTimeoutMilliseconds: 8000,
  telemetryBufferHandle: false,
  developmentRoutes: false,
  basePath: '/',
});

// The pieces createRuntime.ts composes, assembled here with fakes instead
// of the real system adapters - this is what lets a test render "through
// the real stack" (invariant 90) without touching the network or a real
// clock, since createRuntime.ts itself always uses the real adapters.
export async function buildTestRuntime(
  configurationOverrides: Partial<Configuration> = {},
  transport: Transport = createFakeTransport({}),
  clock: Clock = createFakeClock(),
): Promise<Runtime> {
  const configuration: Configuration = Object.freeze({
    ...TEST_CONFIGURATION,
    ...configurationOverrides,
  });
  const randomness = createFakeRandomness();
  const { facade: observability } = createObservability({
    configuration,
    randomness,
  });
  const interactionTracker = createInteractionTracker(observability);
  const http = createHttpClient({
    transport,
    clock,
    randomness,
    observability,
    configuration,
    correlationId: () =>
      interactionTracker.currentCorrelationId() ?? 'test-correlation-id',
  });
  const i18n = await createInternationalization({
    resources: { common: createKeyEchoCatalogue(commonCatalogue) },
    language: Locale.Test,
    observability,
  });
  const tabStorage = createFakeTabStorage();
  const signedInUserStore = createSignedInUserStore({ http, observability });

  return Object.freeze({
    configuration,
    observability,
    http,
    i18n,
    interactionTracker,
    tabStorage,
    signedInUserStore,
    clock,
  });
}

export async function renderRoute(
  children: ReactNode,
  configurationOverrides: Partial<Configuration> = {},
): Promise<RenderResult> {
  const runtime = await buildTestRuntime(configurationOverrides);
  return render(
    <ApplicationRoot runtime={runtime}>{children}</ApplicationRoot>,
  );
}
