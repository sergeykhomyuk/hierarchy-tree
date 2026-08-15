import type { ObservabilityFacade } from '@platform/observability';
import type { KeyValueStorage } from '@platform/runtime';

export type GuardContext = {
  request: Request;
  tabStorage: KeyValueStorage;
  observability: ObservabilityFacade;
};
