import { describe, expect, it, vi } from 'vitest';
import { createFakeClock, createFakeRandomness } from '@shared/testing';
import type { ObservabilityFacade } from '@platform/observability';
import { createHttpClient } from './createHttpClient';
import type { HttpClientDependencies } from './createHttpClient';
import type { Transport } from './transport';
import type { HttpRequest } from './httpRequest';

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

function createHangingTransport(): {
  transport: Transport;
  callCount: () => number;
} {
  let calls = 0;
  const transport: Transport = (request) => {
    calls += 1;
    return new Promise((_resolve, reject) => {
      request.signal.addEventListener('abort', () => {
        reject(new DOMException('aborted', 'AbortError'));
      });
    });
  };
  return { transport, callCount: () => calls };
}

function createTestDependencies(
  overrides: Partial<HttpClientDependencies> = {},
): HttpClientDependencies {
  return {
    transport:
      overrides.transport ??
      (() => Promise.resolve(new Response(null, { status: 200 }))),
    clock: overrides.clock ?? createFakeClock(),
    randomness: overrides.randomness ?? createFakeRandomness(),
    observability: overrides.observability ?? createSpyObservability(),
    configuration: overrides.configuration ?? {
      apiBaseUrl: 'https://api.example.com',
      requestTimeoutMilliseconds: 8000,
    },
    correlationId: overrides.correlationId ?? (() => 'c'.repeat(32)),
  };
}

async function flushMicrotasks(times = 10): Promise<void> {
  for (let index = 0; index < times; index += 1) {
    await Promise.resolve();
  }
}

describe('createHttpClient', () => {
  it('the deadline covers the whole logical request and settles as timeout at the budget', async () => {
    const clock = createFakeClock();
    const { transport } = createHangingTransport();
    const client = createHttpClient(
      createTestDependencies({
        transport,
        clock,
        configuration: {
          apiBaseUrl: 'https://api.example.com',
          requestTimeoutMilliseconds: 1000,
        },
      }),
    );

    const resultPromise = client.request({
      method: 'GET',
      resourcePath: '/things',
      parse: (value) => value,
    });
    await flushMicrotasks();
    await clock.advance(1000);
    const result = await resultPromise;

    expect(result).toEqual({
      outcome: 'failure',
      failure: { kind: 'timeout', timeoutMilliseconds: 1000 },
    });
  });

  it('the deadline is a single logical-request budget spanning a retry, not restarted per attempt', async () => {
    const clock = createFakeClock();
    let callCount = 0;
    const transport: Transport = (request) => {
      callCount += 1;
      if (callCount === 1) {
        return Promise.reject(new Error('network down'));
      }
      return new Promise((_resolve, reject) => {
        request.signal.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
    };
    const client = createHttpClient(
      createTestDependencies({
        transport,
        clock,
        configuration: {
          apiBaseUrl: 'https://api.example.com',
          requestTimeoutMilliseconds: 1000,
        },
      }),
    );

    const resultPromise = client.request({
      method: 'GET',
      resourcePath: '/things',
      parse: (value) => value,
    });
    await flushMicrotasks();
    // The first attempt fails immediately; retryDelayMilliseconds(0, 0) is
    // 100ms under the fixed-at-zero randomness fake.
    await clock.advance(100);
    await flushMicrotasks();
    expect(callCount).toBe(2);
    // A per-attempt deadline would restart at the retry and not fire until
    // a further 1000ms (1100ms total) - advancing to exactly 900 more
    // proves the single deadline set before the retry loop still governs.
    await clock.advance(900);
    const result = await resultPromise;

    expect(result).toEqual({
      outcome: 'failure',
      failure: { kind: 'timeout', timeoutMilliseconds: 1000 },
    });
  });

  it('a caller abort yields cancelled without retrying or reporting an error', async () => {
    const observability = createSpyObservability();
    const { transport, callCount } = createHangingTransport();
    const controller = new AbortController();
    const client = createHttpClient(
      createTestDependencies({ transport, observability }),
    );

    const resultPromise = client.request({
      method: 'GET',
      resourcePath: '/things',
      signal: controller.signal,
      parse: (value) => value,
    });
    await flushMicrotasks();
    controller.abort();
    const result = await resultPromise;

    expect(result).toEqual({ outcome: 'cancelled' });
    expect(callCount()).toBe(1);
    expect(observability.logger.error).not.toHaveBeenCalled();
  });

  it('a caller abort of an in-flight attempt still records its timing, with a cancelled outcome', async () => {
    const observability = createSpyObservability();
    const { transport } = createHangingTransport();
    const controller = new AbortController();
    const client = createHttpClient(
      createTestDependencies({ transport, observability }),
    );

    const resultPromise = client.request({
      method: 'GET',
      resourcePath: '/things',
      signal: controller.signal,
      parse: (value) => value,
    });
    await flushMicrotasks();
    controller.abort();
    await resultPromise;

    expect(observability.tracer.recordTiming).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'cancelled', attempt: 0 }),
    );
  });

  it('a pre-aborted signal yields cancelled with no transport call', async () => {
    const { transport, callCount } = createHangingTransport();
    const controller = new AbortController();
    controller.abort();
    const client = createHttpClient(createTestDependencies({ transport }));

    const result = await client.request({
      method: 'GET',
      resourcePath: '/things',
      signal: controller.signal,
      parse: (value) => value,
    });

    expect(result).toEqual({ outcome: 'cancelled' });
    expect(callCount()).toBe(0);
  });

  it('an error carries no response body content', async () => {
    const transport: Transport = () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            secret: 'do-not-leak',
            accountNumber: '1234567890',
          }),
          { status: 500 },
        ),
      );
    const client = createHttpClient(createTestDependencies({ transport }));

    const result = await client.request({
      method: 'POST',
      resourcePath: '/things',
      parse: (value) => value,
    });

    expect(result.outcome).toBe('failure');
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('do-not-leak');
    expect(serialized).not.toContain('1234567890');
    if (result.outcome === 'failure' && result.failure.kind === 'http') {
      expect(Object.keys(result.failure).sort()).toEqual([
        'kind',
        'status',
        'statusDescription',
      ]);
    }
  });

  it('returns success with the parsed value and status', async () => {
    const transport: Transport = () =>
      Promise.resolve(
        new Response(JSON.stringify({ name: 'root' }), { status: 200 }),
      );
    const client = createHttpClient(createTestDependencies({ transport }));

    const result = await client.request({
      method: 'GET',
      resourcePath: '/things',
      parse: (payload) => (payload as { name: string }).name,
    });

    expect(result).toEqual({ outcome: 'success', value: 'root', status: 200 });
  });

  it('does not retry a POST request that fails', async () => {
    let calls = 0;
    const transport: Transport = () => {
      calls += 1;
      return Promise.resolve(new Response(null, { status: 500 }));
    };
    const client = createHttpClient(createTestDependencies({ transport }));

    const result = await client.request({
      method: 'POST',
      resourcePath: '/things',
      parse: (value) => value,
    });

    expect(calls).toBe(1);
    expect(result.outcome).toBe('failure');
  });

  it('does not retry a 4xx response', async () => {
    let calls = 0;
    const transport: Transport = () => {
      calls += 1;
      return Promise.resolve(new Response(null, { status: 404 }));
    };
    const client = createHttpClient(createTestDependencies({ transport }));

    const result = await client.request({
      method: 'GET',
      resourcePath: '/things',
      parse: (value) => value,
    });

    expect(calls).toBe(1);
    expect(result.outcome).toBe('failure');
  });

  it('retries once on a GET 500 then succeeds', async () => {
    const clock = createFakeClock();
    const randomness = createFakeRandomness([0]);
    let calls = 0;
    const transport: Transport = () => {
      calls += 1;
      if (calls === 1)
        return Promise.resolve(new Response(null, { status: 503 }));
      return Promise.resolve(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    };
    const client = createHttpClient(
      createTestDependencies({ transport, clock, randomness }),
    );

    const resultPromise = client.request({
      method: 'GET',
      resourcePath: '/things',
      parse: (value) => value,
    });
    await flushMicrotasks(50);
    await clock.advance(200);
    await flushMicrotasks(50);
    const result = await resultPromise;

    expect(calls).toBe(2);
    expect(result).toEqual({
      outcome: 'success',
      value: { ok: true },
      status: 200,
    });
  });

  it('maps a thrown transport error to a network failure', async () => {
    const transport: Transport = () => {
      throw new TypeError('fetch failed');
    };
    const client = createHttpClient(createTestDependencies({ transport }));

    const result = await client.request({
      method: 'POST',
      resourcePath: '/things',
      parse: (value) => value,
    });

    expect(result).toEqual({
      outcome: 'failure',
      failure: { kind: 'network' },
    });
  });

  it('maps a JSON parse throw to a parse failure', async () => {
    const transport: Transport = () =>
      Promise.resolve(new Response('not json', { status: 200 }));
    const client = createHttpClient(createTestDependencies({ transport }));

    const result = await client.request({
      method: 'POST',
      resourcePath: '/things',
      parse: (value) => value,
    });

    expect(result).toEqual({ outcome: 'failure', failure: { kind: 'parse' } });
  });

  it('sends a traceparent header in valid W3C format', async () => {
    let capturedHeader: string | null = null;
    const transport: Transport = (request) => {
      capturedHeader = request.headers.get('traceparent');
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    };
    const client = createHttpClient(createTestDependencies({ transport }));

    await client.request({
      method: 'GET',
      resourcePath: '/things',
      parse: (value) => value,
    });

    expect(capturedHeader).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
  });

  it('the traceparent trace id and the timing record correlation id both equal the injected interaction correlation id', async () => {
    const interactionCorrelationId = 'b'.repeat(32);
    const observability = createSpyObservability();
    let capturedHeader: string | null = null;
    const transport: Transport = (request) => {
      capturedHeader = request.headers.get('traceparent');
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    };
    const client = createHttpClient(
      createTestDependencies({
        transport,
        observability,
        correlationId: () => interactionCorrelationId,
      }),
    );

    await client.request({
      method: 'GET',
      resourcePath: '/things',
      parse: (value) => value,
    });

    expect(capturedHeader).toMatch(
      new RegExp(`^00-${interactionCorrelationId}-[0-9a-f]{16}-01$`),
    );
    expect(observability.tracer.recordTiming).toHaveBeenCalledWith(
      expect.objectContaining({ correlationId: interactionCorrelationId }),
    );
  });

  it('serializes a request body as JSON with a content-type header', async () => {
    let capturedContentType: string | null = null;
    let capturedBody: string | undefined;
    const transport: Transport = async (request) => {
      capturedContentType = request.headers.get('content-type');
      capturedBody = await request.text();
      return new Response(JSON.stringify({}), { status: 200 });
    };
    const client = createHttpClient(createTestDependencies({ transport }));

    await client.request({
      method: 'POST',
      resourcePath: '/things',
      body: { name: 'root' },
      parse: (value) => value,
    });

    expect(capturedContentType).toBe('application/json');
    expect(capturedBody).toBe(JSON.stringify({ name: 'root' }));
  });

  it('rejects a protocol-relative resource path without calling the transport', async () => {
    const observability = createSpyObservability();
    let calls = 0;
    const transport: Transport = () => {
      calls += 1;
      return Promise.resolve(new Response(null, { status: 200 }));
    };
    const client = createHttpClient(
      createTestDependencies({ transport, observability }),
    );

    const result = await client.request({
      // A protocol-relative path satisfies the ResourcePath type (it starts
      // with '/'), so this is a runtime-only check (invariant 22).
      resourcePath: '//evil.example',
      method: 'GET',
      parse: (value) => value,
    });

    expect(calls).toBe(0);
    expect(result).toEqual({
      outcome: 'failure',
      failure: { kind: 'network' },
    });
    expect(observability.logger.error).toHaveBeenCalled();
  });

  it('rejects a backslash-escape resource path without calling the transport', async () => {
    const observability = createSpyObservability();
    let calls = 0;
    const transport: Transport = () => {
      calls += 1;
      return Promise.resolve(new Response(null, { status: 200 }));
    };
    const client = createHttpClient(
      createTestDependencies({ transport, observability }),
    );

    const result = await client.request({
      // The WHATWG URL parser treats a leading backslash the same as a
      // forward slash for special schemes: `new URL('/\\evil.example/x',
      // 'https://api.example.com')` resolves to `https://evil.example/x`,
      // escaping the configured origin without a `//` prefix (invariant 22).
      resourcePath: '/\\evil.example/x',
      method: 'GET',
      parse: (value) => value,
    });

    expect(calls).toBe(0);
    expect(result).toEqual({
      outcome: 'failure',
      failure: { kind: 'network' },
    });
    expect(observability.logger.error).toHaveBeenCalled();
  });

  it('reports a timeout, not a parse failure, when the deadline fires while the body is still being read', async () => {
    const clock = createFakeClock();
    const transport: Transport = (request) =>
      Promise.resolve().then(() => {
        const response = new Response(null, { status: 200 });
        response.json = () =>
          new Promise((_resolve, reject) => {
            request.signal.addEventListener('abort', () => {
              reject(new DOMException('aborted', 'AbortError'));
            });
          });
        return response;
      });
    const client = createHttpClient(
      createTestDependencies({
        transport,
        clock,
        configuration: {
          apiBaseUrl: 'https://api.example.com',
          requestTimeoutMilliseconds: 1000,
        },
      }),
    );

    const resultPromise = client.request({
      method: 'GET',
      resourcePath: '/things',
      parse: (value) => value,
    });
    await flushMicrotasks();
    await clock.advance(1000);
    const result = await resultPromise;

    expect(result).toEqual({
      outcome: 'failure',
      failure: { kind: 'timeout', timeoutMilliseconds: 1000 },
    });
  });

  it('rejects an absolute URL at compile time', () => {
    const invalidRequest: HttpRequest<unknown> = {
      method: 'GET',
      // @ts-expect-error - ResourcePath is `/${string}`; an absolute URL does not start with '/'.
      resourcePath: 'https://evil.example/things',
      parse: (value: unknown) => value,
    };

    expect(invalidRequest.method).toBe('GET');
  });
});
