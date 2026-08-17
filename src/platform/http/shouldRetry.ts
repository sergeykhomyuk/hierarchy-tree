import { HttpFailureKind, type HttpFailure } from './httpFailure';
import type { HttpRequest } from './httpRequest';

const MAXIMUM_RETRY_ATTEMPTS = 1;
const RETRYABLE_FAILURE_KINDS = new Set<HttpFailure['kind']>([
  HttpFailureKind.Network,
  HttpFailureKind.Timeout,
]);

export function shouldRetry(
  attempt: number,
  method: HttpRequest<unknown>['method'],
  failure: HttpFailure,
): boolean {
  if (attempt >= MAXIMUM_RETRY_ATTEMPTS) return false;
  if (method !== 'GET') return false;
  if (failure.kind === HttpFailureKind.Http) return failure.status >= 500;
  return RETRYABLE_FAILURE_KINDS.has(failure.kind);
}
