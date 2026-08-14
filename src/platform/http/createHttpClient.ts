import type { Clock, Randomness } from '@platform/runtime';
import type { Configuration } from '@platform/configuration';
import {
  createCorrelationId,
  type ObservabilityFacade,
} from '@platform/observability';
import { createTraceparent } from './createTraceparent';
import { retryDelayMilliseconds } from './retryDelayMilliseconds';
import { shouldRetry } from './shouldRetry';
import type { HttpFailure } from './httpFailure';
import type { HttpRequest } from './httpRequest';
import type { HttpResult } from './httpResult';
import type { Transport } from './transport';

export type HttpClientDependencies = {
  transport: Transport;
  clock: Clock;
  randomness: Randomness;
  observability: ObservabilityFacade;
  configuration: Pick<
    Configuration,
    'apiBaseUrl' | 'requestTimeoutMilliseconds'
  >;
  // The interaction tracker's currentCorrelationId() (invariant 47) - the
  // trace id sent on the wire and the timing record's correlationId are
  // both this value, not the per-logical-request requestId below, which
  // only ties a request's own retried attempts together.
  correlationId: () => string;
};

export type HttpClient = {
  request<Value>(request: HttpRequest<Value>): Promise<HttpResult<Value>>;
};

const MAXIMUM_RETRY_ATTEMPTS = 1;

type AttemptOutcome<Value> =
  | { kind: 'success'; value: Value; status: number }
  | { kind: 'failure'; failure: HttpFailure }
  | { kind: 'aborted' };

export function createHttpClient(
  dependencies: HttpClientDependencies,
): HttpClient {
  const {
    transport,
    clock,
    randomness,
    observability,
    configuration,
    correlationId: getCorrelationId,
  } = dependencies;

  async function request<Value>(
    httpRequest: HttpRequest<Value>,
  ): Promise<HttpResult<Value>> {
    // A string-prefix check (the previous `startsWith('//')` guard) only
    // catches a protocol-relative escape. `new URL('/\\evil.example/x',
    // 'https://api.example.com')` resolves to `https://evil.example/x` -
    // the WHATWG URL parser treats a leading backslash the same as a
    // forward slash for special schemes - which no prefix heuristic
    // catches. Comparing the RESOLVED url's origin against the
    // configured one is the only check that discriminates every escape
    // technique the parser itself is willing to resolve, because it
    // reuses that exact resolution rather than re-deriving a narrower
    // rule from it (invariant 22).
    const url = buildUrl(configuration.apiBaseUrl, httpRequest);
    if (new URL(url).origin !== new URL(configuration.apiBaseUrl).origin) {
      observability.logger.error('http.invalid_resource_path', {
        resourcePath: httpRequest.resourcePath,
      });
      return { outcome: 'failure', failure: { kind: 'network' } };
    }

    if (httpRequest.signal?.aborted) {
      return { outcome: 'cancelled' };
    }

    const requestId = createCorrelationId(randomness);
    const correlationId = getCorrelationId();
    const timeoutMilliseconds =
      httpRequest.timeoutMilliseconds ??
      configuration.requestTimeoutMilliseconds;
    const deadlineController = new AbortController();
    const cancelDeadlineTimer = clock.setTimer(timeoutMilliseconds, () => {
      deadlineController.abort();
    });
    const signal = httpRequest.signal
      ? AbortSignal.any([httpRequest.signal, deadlineController.signal])
      : deadlineController.signal;

    try {
      let attempt = 0;

      while (true) {
        const attemptStartedAt = clock.now();
        const traceparent = createTraceparent(correlationId, randomness);
        const rawOutcome = await performAttempt(
          httpRequest,
          url,
          traceparent,
          signal,
          transport,
        );
        const durationMilliseconds = clock.now() - attemptStartedAt;

        if (rawOutcome.kind === 'aborted') {
          if (httpRequest.signal?.aborted) {
            observability.logger.debug('http.request_cancelled', {
              resourcePath: httpRequest.resourcePath,
              requestId,
            });
            observability.tracer.recordTiming({
              method: httpRequest.method,
              resourcePath: httpRequest.resourcePath,
              outcome: 'cancelled',
              durationMilliseconds,
              correlationId,
              attempt,
              requestId,
            });
            return { outcome: 'cancelled' };
          }

          observability.tracer.recordTiming({
            method: httpRequest.method,
            resourcePath: httpRequest.resourcePath,
            outcome: 'failure',
            durationMilliseconds,
            correlationId,
            attempt,
            requestId,
          });
          return {
            outcome: 'failure',
            failure: { kind: 'timeout', timeoutMilliseconds },
          };
        }

        const status =
          rawOutcome.kind === 'success'
            ? rawOutcome.status
            : rawOutcome.failure.kind === 'http'
              ? rawOutcome.failure.status
              : undefined;
        observability.tracer.recordTiming({
          method: httpRequest.method,
          resourcePath: httpRequest.resourcePath,
          outcome: rawOutcome.kind,
          durationMilliseconds,
          correlationId,
          attempt,
          requestId,
          ...(status !== undefined ? { status } : {}),
        });

        if (rawOutcome.kind === 'success') {
          return {
            outcome: 'success',
            value: rawOutcome.value,
            status: rawOutcome.status,
          };
        }

        if (
          attempt < MAXIMUM_RETRY_ATTEMPTS &&
          shouldRetry(attempt, httpRequest.method, rawOutcome.failure)
        ) {
          const delay = retryDelayMilliseconds(
            attempt,
            randomness.nextUnitInterval(),
          );
          try {
            await clock.wait(delay, signal);
          } catch {
            if (httpRequest.signal?.aborted) return { outcome: 'cancelled' };
            return {
              outcome: 'failure',
              failure: { kind: 'timeout', timeoutMilliseconds },
            };
          }
          attempt += 1;
          continue;
        }

        return { outcome: 'failure', failure: rawOutcome.failure };
      }
    } finally {
      cancelDeadlineTimer();
    }
  }

  return { request };
}

function buildUrl(
  apiBaseUrl: string,
  httpRequest: HttpRequest<unknown>,
): string {
  const url = new URL(httpRequest.resourcePath, apiBaseUrl);
  for (const [key, value] of Object.entries(
    httpRequest.searchParameters ?? {},
  )) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function statusDescription(status: number): string {
  if (status >= 500) return 'server error';
  if (status >= 400) return 'client error';
  return 'error';
}

async function performAttempt<Value>(
  httpRequest: HttpRequest<Value>,
  url: string,
  traceparent: string,
  signal: AbortSignal,
  transport: Transport,
): Promise<AttemptOutcome<Value>> {
  const headers = new Headers({ traceparent });
  let body: BodyInit | undefined;
  if (httpRequest.body !== undefined) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(httpRequest.body);
  }
  const webRequest = new Request(url, {
    method: httpRequest.method,
    headers,
    signal,
    ...(body !== undefined ? { body } : {}),
  });

  let response: Response;
  try {
    response = await transport(webRequest);
  } catch {
    if (signal.aborted) return { kind: 'aborted' };
    return { kind: 'failure', failure: { kind: 'network' } };
  }

  if (!response.ok) {
    return {
      kind: 'failure',
      failure: {
        kind: 'http',
        status: response.status,
        statusDescription: statusDescription(response.status),
      },
    };
  }

  try {
    const payload: unknown = await response.json();
    return {
      kind: 'success',
      value: httpRequest.parse(payload),
      status: response.status,
    };
  } catch {
    // The deadline (or a caller abort) can fire while the body is still
    // being read, which rejects response.json() the same way a genuine
    // parse failure would - unconditionally mapping this catch to
    // 'parse' misreported a cancellation/timeout as malformed JSON.
    if (signal.aborted) return { kind: 'aborted' };
    return { kind: 'failure', failure: { kind: 'parse' } };
  }
}
