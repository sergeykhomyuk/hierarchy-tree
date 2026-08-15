import { describe, expect, it, vi } from 'vitest';
import { createFakeClock, createFakeRandomness } from '@shared/testing';
import { createHttpClient } from '@platform/http';
import type { HttpClientDependencies, Transport } from '@platform/http';
import type { ObservabilityFacade } from '@platform/observability';
import type { DerivedSecret } from '../domain/derivedSecret';
import { lookupUserIdentifier } from './lookupUserIdentifier';

const SECRET = 'AB'.repeat(32) as DerivedSecret;
const CORRELATION_ID = 'c'.repeat(32);

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

function createTestClient(overrides: Partial<HttpClientDependencies> = {}): {
  client: ReturnType<typeof createHttpClient>;
  observability: ObservabilityFacade;
} {
  const observability = overrides.observability ?? createSpyObservability();
  const client = createHttpClient({
    transport:
      overrides.transport ??
      (() => Promise.resolve(new Response('null', { status: 200 }))),
    clock: overrides.clock ?? createFakeClock(),
    randomness: overrides.randomness ?? createFakeRandomness(),
    observability,
    configuration: overrides.configuration ?? {
      apiBaseUrl: 'https://api.example.com',
      requestTimeoutMilliseconds: 8000,
    },
    correlationId: overrides.correlationId ?? (() => CORRELATION_ID),
  });
  return { client, observability };
}

async function flushMicrotasks(times = 10): Promise<void> {
  for (let index = 0; index < times; index += 1) {
    await Promise.resolve();
  }
}

describe('lookupUserIdentifier', () => {
  it('issues exactly one request, to the secrets path', async () => {
    let calls = 0;
    let capturedPath = '';
    const transport: Transport = (request) => {
      calls += 1;
      capturedPath = new URL(request.url).pathname;
      return Promise.resolve(new Response('null', { status: 200 }));
    };
    const { client } = createTestClient({ transport });

    await lookupUserIdentifier(client, SECRET, CORRELATION_ID);

    expect(calls).toBe(1);
    expect(capturedPath).toBe(`/secrets/${SECRET}.json`);
  });

  it('maps a null body to no match without reporting an error', async () => {
    const { client, observability } = createTestClient();

    const outcome = await lookupUserIdentifier(client, SECRET, CORRELATION_ID);

    expect(outcome).toEqual({ kind: 'noMatch' });
    expect(observability.logger.error).not.toHaveBeenCalled();
  });

  it('maps every transport failure arm to the service-problem outcome', async () => {
    // 'network' and a >=500 status retry once for GET (shouldRetry.ts), so
    // those two cases need the fake clock advanced past the retry delay;
    // 404 and a malformed body ('parse') do not retry.
    const retryingCases: Transport[] = [
      () => {
        throw new TypeError('network down');
      },
      () => Promise.resolve(new Response(null, { status: 500 })),
    ];
    const nonRetryingCases: Transport[] = [
      () => Promise.resolve(new Response(null, { status: 404 })),
      () => Promise.resolve(new Response('{}', { status: 200 })),
    ];

    for (const transport of retryingCases) {
      const clock = createFakeClock();
      const { client } = createTestClient({ transport, clock });

      const outcomePromise = lookupUserIdentifier(
        client,
        SECRET,
        CORRELATION_ID,
      );
      await flushMicrotasks(50);
      await clock.advance(200);
      const outcome = await outcomePromise;

      expect(outcome).toEqual({
        kind: 'serviceProblem',
        correlationId: CORRELATION_ID,
      });
    }

    for (const transport of nonRetryingCases) {
      const { client } = createTestClient({ transport });

      const outcome = await lookupUserIdentifier(
        client,
        SECRET,
        CORRELATION_ID,
      );

      expect(outcome).toEqual({
        kind: 'serviceProblem',
        correlationId: CORRELATION_ID,
      });
    }
  });

  it('makes one transport call on a timeout', async () => {
    const clock = createFakeClock();
    let calls = 0;
    const transport: Transport = (request) => {
      calls += 1;
      return new Promise((_resolve, reject) => {
        request.signal.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
    };
    const { client } = createTestClient({
      transport,
      clock,
      configuration: {
        apiBaseUrl: 'https://api.example.com',
        requestTimeoutMilliseconds: 1000,
      },
    });

    const outcomePromise = lookupUserIdentifier(client, SECRET, CORRELATION_ID);
    await flushMicrotasks();
    await clock.advance(1000);
    const outcome = await outcomePromise;

    expect(calls).toBe(1);
    expect(outcome).toEqual({
      kind: 'serviceProblem',
      correlationId: CORRELATION_ID,
    });
  });

  it('records no error-level entry and no settled event when the caller aborts', async () => {
    const controller = new AbortController();
    const transport: Transport = (request) =>
      new Promise((_resolve, reject) => {
        request.signal.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
    const { client, observability } = createTestClient({ transport });

    const outcomePromise = lookupUserIdentifier(
      client,
      SECRET,
      CORRELATION_ID,
      controller.signal,
    );
    await flushMicrotasks();
    controller.abort();
    const outcome = await outcomePromise;

    expect(outcome).toEqual({ kind: 'cancelled' });
    expect(observability.logger.error).not.toHaveBeenCalled();
    expect(observability.analytics.track).not.toHaveBeenCalled();
  });
});
