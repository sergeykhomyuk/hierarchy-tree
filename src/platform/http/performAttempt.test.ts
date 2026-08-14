import { describe, expect, it } from 'vitest';
import { performAttempt } from './performAttempt';
import type { HttpRequest } from './httpRequest';
import type { Transport } from './transport';

function createRequest(
  overrides: Partial<HttpRequest<unknown>> = {},
): HttpRequest<unknown> {
  return {
    method: 'GET',
    resourcePath: '/things',
    parse: (value) => value,
    ...overrides,
  };
}

describe('performAttempt', () => {
  it('reports success with the parsed body and status', async () => {
    const transport: Transport = () =>
      Promise.resolve(new Response(JSON.stringify({ id: 1 }), { status: 200 }));

    const outcome = await performAttempt(
      createRequest({ parse: (value) => value as { id: number } }),
      'https://api.example.com/things',
      'traceparent-value',
      new AbortController().signal,
      transport,
    );

    expect(outcome).toEqual({
      kind: 'success',
      value: { id: 1 },
      status: 200,
    });
  });

  it('sends the traceparent header on every attempt', async () => {
    let receivedTraceparent: string | null = null;
    const transport: Transport = (request) => {
      receivedTraceparent = request.headers.get('traceparent');
      return Promise.resolve(new Response(null, { status: 200 }));
    };

    await performAttempt(
      createRequest(),
      'https://api.example.com/things',
      'traceparent-value',
      new AbortController().signal,
      transport,
    );

    expect(receivedTraceparent).toBe('traceparent-value');
  });

  it('serializes a request body as JSON with a matching content-type', async () => {
    let receivedContentType: string | null = null;
    let receivedBody: string | null = null;
    const transport: Transport = async (request) => {
      receivedContentType = request.headers.get('content-type');
      receivedBody = await request.text();
      return new Response(null, { status: 200 });
    };

    await performAttempt(
      createRequest({ method: 'POST', body: { name: 'a' } }),
      'https://api.example.com/things',
      'traceparent-value',
      new AbortController().signal,
      transport,
    );

    expect(receivedContentType).toBe('application/json');
    expect(receivedBody).toBe(JSON.stringify({ name: 'a' }));
  });

  it('sends no body and no content-type header when the request has none', async () => {
    let receivedContentType: string | null = null;
    let receivedBody: string | null = null;
    const transport: Transport = async (request) => {
      receivedContentType = request.headers.get('content-type');
      receivedBody = await request.text();
      return new Response(null, { status: 200 });
    };

    await performAttempt(
      createRequest(),
      'https://api.example.com/things',
      'traceparent-value',
      new AbortController().signal,
      transport,
    );

    expect(receivedContentType).toBeNull();
    expect(receivedBody).toBe('');
  });

  it('reports a failure with the http status and description for a non-ok response', async () => {
    const transport: Transport = () =>
      Promise.resolve(new Response(null, { status: 503 }));

    const outcome = await performAttempt(
      createRequest(),
      'https://api.example.com/things',
      'traceparent-value',
      new AbortController().signal,
      transport,
    );

    expect(outcome).toEqual({
      kind: 'failure',
      failure: { kind: 'http', status: 503, statusDescription: 'server error' },
    });
  });

  it('reports a network failure when the transport rejects without an abort', async () => {
    const transport: Transport = () => Promise.reject(new Error('offline'));

    const outcome = await performAttempt(
      createRequest(),
      'https://api.example.com/things',
      'traceparent-value',
      new AbortController().signal,
      transport,
    );

    expect(outcome).toEqual({ kind: 'failure', failure: { kind: 'network' } });
  });

  it('reports aborted (not network failure) when the transport rejects on an aborted signal', async () => {
    const controller = new AbortController();
    const transport: Transport = () => {
      controller.abort();
      return Promise.reject(new DOMException('aborted', 'AbortError'));
    };

    const outcome = await performAttempt(
      createRequest(),
      'https://api.example.com/things',
      'traceparent-value',
      controller.signal,
      transport,
    );

    expect(outcome).toEqual({ kind: 'aborted' });
  });

  it('reports a parse failure when the body cannot be read as JSON without an abort', async () => {
    const transport: Transport = () =>
      Promise.resolve(new Response('not json', { status: 200 }));

    const outcome = await performAttempt(
      createRequest(),
      'https://api.example.com/things',
      'traceparent-value',
      new AbortController().signal,
      transport,
    );

    expect(outcome).toEqual({ kind: 'failure', failure: { kind: 'parse' } });
  });

  it('reports aborted (not parse failure) when the body read rejects on an aborted signal', async () => {
    const controller = new AbortController();
    const transport: Transport = () => {
      controller.abort();
      return Promise.resolve(new Response('not json', { status: 200 }));
    };

    const outcome = await performAttempt(
      createRequest(),
      'https://api.example.com/things',
      'traceparent-value',
      controller.signal,
      transport,
    );

    expect(outcome).toEqual({ kind: 'aborted' });
  });
});
