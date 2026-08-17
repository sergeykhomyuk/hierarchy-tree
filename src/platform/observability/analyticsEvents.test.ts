import { describe, expect, it } from 'vitest';
import type { AnalyticsPayloads } from './analyticsEvents';
import { SignInOutcome } from './signInOutcome';

describe('the analytics catalogue', () => {
  it('carries the three sign-in events with their payloads', () => {
    const started: AnalyticsPayloads['auth.sign_in_started'] = {
      correlationId: 'c'.repeat(32),
    };
    const settled: AnalyticsPayloads['auth.sign_in_settled'] = {
      correlationId: 'c'.repeat(32),
      outcome: SignInOutcome.SignedIn,
    };
    const signedOut: AnalyticsPayloads['auth.signed_out'] = {
      correlationId: 'c'.repeat(32),
    };

    expect(started.correlationId).toHaveLength(32);
    expect(settled.outcome).toBe(SignInOutcome.SignedIn);
    expect(signedOut.correlationId).toHaveLength(32);
    // No payload carries anything beyond a correlation id and, for the
    // settled event, its three-value outcome - never a user id, an
    // email or anything derived from a credential (invariants 125, 126).
    expect(Object.keys(started).sort()).toEqual(['correlationId']);
    expect(Object.keys(settled).sort()).toEqual(['correlationId', 'outcome']);
    expect(Object.keys(signedOut).sort()).toEqual(['correlationId']);
  });
});
