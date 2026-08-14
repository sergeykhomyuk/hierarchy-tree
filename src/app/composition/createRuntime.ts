import type { i18n } from 'i18next';
import type { Configuration } from '@platform/configuration';
import {
  createCorrelationId,
  createObservability,
  type ObservabilityFacade,
} from '@platform/observability';
import {
  createFetchTransport,
  createHttpClient,
  type HttpClient,
} from '@platform/http';
import {
  createInternationalization,
  createKeyEchoCatalogue,
  detectLocale,
  Locale,
} from '@platform/internationalization';
import {
  createSystemClock,
  createSystemRandomness,
  createTabStorage,
  type KeyValueStorage,
} from '@platform/runtime';
import {
  createSignedInUserStore,
  type SignedInUserStore,
} from '@features/auth';
import { createInteractionTracker, type InteractionTracker } from '../routing';
import commonCatalogue from '../locales/en/common.json';

export type Runtime = Readonly<{
  configuration: Configuration;
  observability: ObservabilityFacade;
  http: HttpClient;
  i18n: i18n;
  interactionTracker: InteractionTracker;
  tabStorage: KeyValueStorage;
  signedInUserStore: SignedInUserStore;
}>;

export async function createRuntime(
  configuration: Configuration,
): Promise<Runtime> {
  const randomness = createSystemRandomness();
  const clock = createSystemClock();

  const { facade: observability, bufferHandle } = createObservability({
    configuration,
    randomness,
  });

  if (configuration.telemetryBufferHandle && bufferHandle !== null) {
    globalThis.__hierarchyTreeTelemetry = bufferHandle;
  }

  const interactionTracker = createInteractionTracker(observability);

  const http = createHttpClient({
    transport: createFetchTransport(),
    clock,
    randomness,
    observability,
    configuration,
    correlationId: () =>
      interactionTracker.currentCorrelationId() ??
      createCorrelationId(randomness),
  });

  const language = detectLocale(navigator.languages);
  const i18n = await createInternationalization({
    resources: {
      common:
        language === Locale.Test
          ? createKeyEchoCatalogue(commonCatalogue)
          : commonCatalogue,
    },
    language,
    observability,
  });

  const tabStorage = createTabStorage();
  // Built once per page (invariant 97b), with no reader until the header
  // lands (M4) - its lifetime is the page's, so a reload re-requests.
  const signedInUserStore = createSignedInUserStore({ http, observability });

  return Object.freeze({
    configuration,
    observability,
    http,
    i18n,
    interactionTracker,
    tabStorage,
    signedInUserStore,
  });
}
