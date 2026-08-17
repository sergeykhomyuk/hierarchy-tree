import { HttpResultOutcome, type HttpClient } from '@platform/http';
import {
  userIdentifier,
  type DerivedSecret,
  type UserIdentifier,
} from '../domain';
import { lookupResultSchema } from './lookupResultSchema';
import { secretResourcePath } from './secretResourcePath';

export const LookupOutcomeKind = {
  SignedIn: 'signedIn',
  NoMatch: 'noMatch',
  ServiceProblem: 'serviceProblem',
  Cancelled: 'cancelled',
} as const;

export type LookupOutcomeKind =
  (typeof LookupOutcomeKind)[keyof typeof LookupOutcomeKind];

export type LookupOutcome =
  | { kind: typeof LookupOutcomeKind.SignedIn; userId: UserIdentifier }
  | { kind: typeof LookupOutcomeKind.NoMatch }
  | { kind: typeof LookupOutcomeKind.ServiceProblem; correlationId: string }
  | { kind: typeof LookupOutcomeKind.Cancelled };

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

  if (result.outcome === HttpResultOutcome.Cancelled) {
    return { kind: LookupOutcomeKind.Cancelled };
  }

  if (result.outcome === HttpResultOutcome.Failure) {
    return { kind: LookupOutcomeKind.ServiceProblem, correlationId };
  }

  if (result.value === null) {
    return { kind: LookupOutcomeKind.NoMatch };
  }

  return {
    kind: LookupOutcomeKind.SignedIn,
    userId: userIdentifier(result.value),
  };
}
