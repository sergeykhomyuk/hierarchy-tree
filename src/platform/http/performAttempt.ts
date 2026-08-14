import type { HttpFailure } from './httpFailure';
import type { HttpRequest } from './httpRequest';
import { statusDescription } from './statusDescription';
import type { Transport } from './transport';

export type AttemptOutcome<Value> =
  | { kind: 'success'; value: Value; status: number }
  | { kind: 'failure'; failure: HttpFailure }
  | { kind: 'aborted' };

export async function performAttempt<Value>(
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
