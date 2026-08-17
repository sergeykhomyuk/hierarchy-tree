import { describe, expect, it, vi } from 'vitest';
import { createFakeClock, createFakeRandomness } from '@shared/testing';
import { createHttpClient } from '@platform/http';
import type { HttpClientDependencies, Transport } from '@platform/http';
import type { ObservabilityFacade } from '@platform/observability';
import { userIdentifier } from '../domain';
import { createSignedInUserStore } from './createSignedInUserStore';

function createSpyObservability(): ObservabilityFacade {
  return {
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    tracer: {
      recordTiming: vi.fn(),
      startInteraction: vi.fn(() => 'a'.repeat(32)),
    },
    analytics: { track: vi.fn() },
  };
}

describe('createSignedInUserStore', () => {
  it('requests a given user once and reuses the promise', async () => {
    let calls = 0;
    const transport: Transport = () => {
      calls += 1;
      return Promise.resolve(
        new Response(
          JSON.stringify([
            { id: 'user_1', firstName: 'Ada', lastName: 'Lovelace' },
          ]),
          { status: 200 },
        ),
      );
    };
    const observability = createSpyObservability();
    const dependencies: HttpClientDependencies = {
      transport,
      clock: createFakeClock(),
      randomness: createFakeRandomness(),
      observability,
      configuration: {
        apiBaseUrl: 'https://api.example.com',
        requestTimeoutMilliseconds: 8000,
      },
      correlationId: () => 'c'.repeat(32),
    };
    const http = createHttpClient(dependencies);
    const store = createSignedInUserStore({ http, observability });
    const userId = userIdentifier('user_1');

    const first = store.read(userId);
    const second = store.read(userId);

    expect(first).toBe(second);
    await first;
    expect(calls).toBe(1);
  });
});
