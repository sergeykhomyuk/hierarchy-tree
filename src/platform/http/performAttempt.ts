import { HttpFailureKind, type HttpFailure } from './httpFailure';
import type { HttpRequest } from './httpRequest';
import { statusDescription } from './statusDescription';
import type { Transport } from './transport';

export const AttemptOutcomeKind = {
  Success: 'success',
  Failure: 'failure',
  Aborted: 'aborted',
} as const;

export type AttemptOutcomeKind =
  (typeof AttemptOutcomeKind)[keyof typeof AttemptOutcomeKind];

export type AttemptOutcome<Value> =
  | { kind: typeof AttemptOutcomeKind.Success; value: Value; status: number }
  | { kind: typeof AttemptOutcomeKind.Failure; failure: HttpFailure }
  | { kind: typeof AttemptOutcomeKind.Aborted };

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
    if (signal.aborted) return { kind: AttemptOutcomeKind.Aborted };
    return {
      kind: AttemptOutcomeKind.Failure,
      failure: { kind: HttpFailureKind.Network },
    };
  }

  if (!response.ok) {
    return {
      kind: AttemptOutcomeKind.Failure,
      failure: {
        kind: HttpFailureKind.Http,
        status: response.status,
        statusDescription: statusDescription(response.status),
      },
    };
  }

  try {
    const payload: unknown = await response.json();
    return {
      kind: AttemptOutcomeKind.Success,
      value: httpRequest.parse(payload),
      status: response.status,
    };
  } catch {
    // The deadline (or a caller abort) can fire while the body is still
    // being read, which rejects response.json() the same way a genuine
    // parse failure would - unconditionally mapping this catch to
    // 'parse' misreported a cancellation/timeout as malformed JSON.
    if (signal.aborted) return { kind: AttemptOutcomeKind.Aborted };
    return {
      kind: AttemptOutcomeKind.Failure,
      failure: { kind: HttpFailureKind.Parse },
    };
  }
}
