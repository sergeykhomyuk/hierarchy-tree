import { describe, expect, it, vi } from 'vitest';
import type { LoaderFunctionArgs } from 'react-router';
import { createHttpClient } from '@platform/http';
import type { HttpClientDependencies, Transport } from '@platform/http';
import type { ObservabilityFacade } from '@platform/observability';
import { createFakeClock, createFakeRandomness } from '@shared/testing';
import { createHierarchyLoader } from './createHierarchyLoader';
import type { InteractionTracker } from './createInteractionTracker';

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

function createSpyInteractionTracker(
  correlationId: string | null,
): InteractionTracker {
  return {
    attach: vi.fn(() => () => {}),
    currentCorrelationId: () => correlationId,
    beginInteraction: vi.fn(() => 'b'.repeat(32)),
    endInteraction: vi.fn(),
    shouldReportPrimitive: vi.fn(() => true),
  };
}

function createTestClient(
  transport: Transport,
  observability: ObservabilityFacade,
): ReturnType<typeof createHttpClient> {
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
  return createHttpClient(dependencies);
}

describe('createHierarchyLoader', () => {
  it('the hierarchy loader returns an object holding a promise and does not await it', () => {
    const observability = createSpyObservability();
    const transport: Transport = () => new Promise(() => {}); // never resolves
    const http = createTestClient(transport, observability);
    const loader = createHierarchyLoader({
      http,
      observability,
      interactionTracker: createSpyInteractionTracker('a'.repeat(32)),
      randomness: createFakeRandomness(),
    });

    const result = loader({
      request: new Request('https://example.test/'),
    } as LoaderFunctionArgs);

    expect(result.hierarchy).toBeInstanceOf(Promise);
  });

  it('the loader forwards the request signal into the users request', () => {
    const observability = createSpyObservability();
    let capturedSignal: AbortSignal | null | undefined;
    const transport: Transport = (request) => {
      capturedSignal = request.signal;
      return new Promise(() => {});
    };
    const http = createTestClient(transport, observability);
    const loader = createHierarchyLoader({
      http,
      observability,
      interactionTracker: createSpyInteractionTracker('a'.repeat(32)),
      randomness: createFakeRandomness(),
    });
    const controller = new AbortController();

    loader({
      request: new Request('https://example.test/', {
        signal: controller.signal,
      }),
    } as LoaderFunctionArgs);

    // The client merges the loader's signal with its own deadline signal
    // through AbortSignal.any (createHttpClient.ts), so the transport sees
    // a composed signal, not the loader's original one - what matters is
    // that aborting the loader's signal aborts the one the transport got.
    expect(capturedSignal?.aborted).toBe(false);
    controller.abort();
    expect(capturedSignal?.aborted).toBe(true);
  });
});
