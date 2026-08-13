import { describe, expect, it, vi } from 'vitest';
import { createFakeClock, createFakeRandomness } from '@shared/testing';
import type { ObservabilityFacade } from '@platform/observability';
import { createHttpClient } from './createHttpClient';
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

async function flushMicrotasks(times = 10): Promise<void> {
  for (let index = 0; index < times; index += 1) {
    await Promise.resolve();
  }
}

describe('createHttpClient', () => {
  it('the deadline covers the whole logical request and settles as timeout at the budget', async () => {
    const clock = createFakeClock();
    const randomness = createFakeRandomness();
    const observability = createSpyObservability();
    const { transport } = createHangingTransport();
    const client = createHttpClient({
      transport,
      clock,
      randomness,
      observability,
      configuration: {
        apiBaseUrl: 'https://api.example.com',
        requestTimeoutMilliseconds: 1000,
      },
    });

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

  it('a caller abort yields cancelled without retrying or reporting an error', async () => {
    const clock = createFakeClock();
    const randomness = createFakeRandomness();
    const observability = createSpyObservability();
    const { transport, callCount } = createHangingTransport();
    const controller = new AbortController();
    const client = createHttpClient({
      transport,
      clock,
      randomness,
      observability,
      configuration: {
        apiBaseUrl: 'https://api.example.com',
        requestTimeoutMilliseconds: 8000,
      },
    });

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

  it('a pre-aborted signal yields cancelled with no transport call', async () => {
    const clock = createFakeClock();
    const randomness = createFakeRandomness();
    const observability = createSpyObservability();
    const { transport, callCount } = createHangingTransport();
    const controller = new AbortController();
    controller.abort();
    const client = createHttpClient({
      transport,
      clock,
      randomness,
      observability,
      configuration: {
        apiBaseUrl: 'https://api.example.com',
        requestTimeoutMilliseconds: 8000,
      },
    });

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
    const clock = createFakeClock();
    const randomness = createFakeRandomness();
    const observability = createSpyObservability();
    const transport: Transport = () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            secret: 'do-not-leak',
            accountNumber: '1234567890',
          }),
          {
            status: 500,
          },
        ),
      );
    const client = createHttpClient({
      transport,
      clock,
      randomness,
      observability,
      configuration: {
        apiBaseUrl: 'https://api.example.com',
        requestTimeoutMilliseconds: 8000,
      },
    });

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
    const clock = createFakeClock();
    const randomness = createFakeRandomness();
    const observability = createSpyObservability();
    const transport: Transport = () =>
      Promise.resolve(
        new Response(JSON.stringify({ name: 'root' }), { status: 200 }),
      );
    const client = createHttpClient({
      transport,
      clock,
      randomness,
      observability,
      configuration: {
        apiBaseUrl: 'https://api.example.com',
        requestTimeoutMilliseconds: 8000,
      },
    });

    const result = await client.request({
      method: 'GET',
      resourcePath: '/things',
      parse: (payload) => (payload as { name: string }).name,
    });

    expect(result).toEqual({ outcome: 'success', value: 'root', status: 200 });
  });

  it('does not retry a POST request that fails', async () => {
    const clock = createFakeClock();
    const randomness = createFakeRandomness();
    const observability = createSpyObservability();
    let calls = 0;
    const transport: Transport = () => {
      calls += 1;
      return Promise.resolve(new Response(null, { status: 500 }));
    };
    const client = createHttpClient({
      transport,
      clock,
      randomness,
      observability,
      configuration: {
        apiBaseUrl: 'https://api.example.com',
        requestTimeoutMilliseconds: 8000,
      },
    });

    const result = await client.request({
      method: 'POST',
      resourcePath: '/things',
      parse: (value) => value,
    });

    expect(calls).toBe(1);
    expect(result.outcome).toBe('failure');
  });

  it('does not retry a 4xx response', async () => {
    const clock = createFakeClock();
    const randomness = createFakeRandomness();
    const observability = createSpyObservability();
    let calls = 0;
    const transport: Transport = () => {
      calls += 1;
      return Promise.resolve(new Response(null, { status: 404 }));
    };
    const client = createHttpClient({
      transport,
      clock,
      randomness,
      observability,
      configuration: {
        apiBaseUrl: 'https://api.example.com',
        requestTimeoutMilliseconds: 8000,
      },
    });

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
    const observability = createSpyObservability();
    let calls = 0;
    const transport: Transport = () => {
      calls += 1;
      if (calls === 1)
        return Promise.resolve(new Response(null, { status: 503 }));
      return Promise.resolve(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    };
    const client = createHttpClient({
      transport,
      clock,
      randomness,
      observability,
      configuration: {
        apiBaseUrl: 'https://api.example.com',
        requestTimeoutMilliseconds: 8000,
      },
    });

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
    const clock = createFakeClock();
    const randomness = createFakeRandomness();
    const observability = createSpyObservability();
    const transport: Transport = () => {
      throw new TypeError('fetch failed');
    };
    const client = createHttpClient({
      transport,
      clock,
      randomness,
      observability,
      configuration: {
        apiBaseUrl: 'https://api.example.com',
        requestTimeoutMilliseconds: 8000,
      },
    });

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
    const clock = createFakeClock();
    const randomness = createFakeRandomness();
    const observability = createSpyObservability();
    const transport: Transport = () =>
      Promise.resolve(new Response('not json', { status: 200 }));
    const client = createHttpClient({
      transport,
      clock,
      randomness,
      observability,
      configuration: {
        apiBaseUrl: 'https://api.example.com',
        requestTimeoutMilliseconds: 8000,
      },
    });

    const result = await client.request({
      method: 'POST',
      resourcePath: '/things',
      parse: (value) => value,
    });

    expect(result).toEqual({ outcome: 'failure', failure: { kind: 'parse' } });
  });

  it('sends a traceparent header in valid W3C format', async () => {
    const clock = createFakeClock();
    const randomness = createFakeRandomness();
    const observability = createSpyObservability();
    let capturedHeader: string | null = null;
    const transport: Transport = (request) => {
      capturedHeader = request.headers.get('traceparent');
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    };
    const client = createHttpClient({
      transport,
      clock,
      randomness,
      observability,
      configuration: {
        apiBaseUrl: 'https://api.example.com',
        requestTimeoutMilliseconds: 8000,
      },
    });

    await client.request({
      method: 'GET',
      resourcePath: '/things',
      parse: (value) => value,
    });

    expect(capturedHeader).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
  });

  it('serializes a request body as JSON with a content-type header', async () => {
    const clock = createFakeClock();
    const randomness = createFakeRandomness();
    const observability = createSpyObservability();
    let capturedContentType: string | null = null;
    let capturedBody: string | undefined;
    const transport: Transport = async (request) => {
      capturedContentType = request.headers.get('content-type');
      capturedBody = await request.text();
      return new Response(JSON.stringify({}), { status: 200 });
    };
    const client = createHttpClient({
      transport,
      clock,
      randomness,
      observability,
      configuration: {
        apiBaseUrl: 'https://api.example.com',
        requestTimeoutMilliseconds: 8000,
      },
    });

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
    const clock = createFakeClock();
    const randomness = createFakeRandomness();
    const observability = createSpyObservability();
    let calls = 0;
    const transport: Transport = () => {
      calls += 1;
      return Promise.resolve(new Response(null, { status: 200 }));
    };
    const client = createHttpClient({
      transport,
      clock,
      randomness,
      observability,
      configuration: {
        apiBaseUrl: 'https://api.example.com',
        requestTimeoutMilliseconds: 8000,
      },
    });

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
