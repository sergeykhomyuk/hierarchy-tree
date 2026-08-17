import type { HttpClient } from '@platform/http';
import { userIdentifier, type DerivedSecret, type UserIdentifier } from '../domain';
import { lookupResultSchema } from './lookupResultSchema';
import { secretResourcePath } from './secretResourcePath';

export type LookupOutcome =
  | { kind: 'signedIn'; userId: UserIdentifier }
  | { kind: 'noMatch' }
  | { kind: 'serviceProblem'; correlationId: string }
  | { kind: 'cancelled' };

// The one lookup request (invariants 13-22): a GET with no query string, no
// body, and every failure arm - network, timeout, an HTTP status, a
// malformed body - collapsing to the same serviceProblem outcome, never
// noMatch, which is reserved for a genuine null body.
export async function lookupUserIdentifier(
  http: HttpClient,
  secret: DerivedSecret,
  correlationId: string,
  signal?: AbortSignal,
): Promise<LookupOutcome> {
  const result = await http.request({
    method: 'GET',
    resourcePath: secretResourcePath(secret),
    ...(signal !== undefined ? { signal } : {}),
    parse: (payload) => lookupResultSchema.parse(payload),
  });

  if (result.outcome === 'cancelled') {
    return { kind: 'cancelled' };
  }

  if (result.outcome === 'failure') {
    return { kind: 'serviceProblem', correlationId };
  }

  if (result.value === null) {
    return { kind: 'noMatch' };
  }

  return { kind: 'signedIn', userId: userIdentifier(result.value) };
}
