import { execFileSync } from 'node:child_process';
import { describe, expect, it, vi } from 'vitest';
import type {
  AnalyticsPayloads,
  ObservabilityFacade,
} from '@platform/observability';
import { SignInOutcome } from './signInOutcome';
import './analyticsEvents';

describe('the auth analytics augmentation', () => {
  it('the auth events are visible to the observability facade through declaration merging', () => {
    const track = vi.fn();
    const observability: Pick<ObservabilityFacade, 'analytics'> = {
      analytics: { track },
    };

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

    observability.analytics.track('auth.sign_in_started', started);
    observability.analytics.track('auth.sign_in_settled', settled);
    observability.analytics.track('auth.signed_out', signedOut);

    expect(track).toHaveBeenNthCalledWith(1, 'auth.sign_in_started', started);
    expect(track).toHaveBeenNthCalledWith(2, 'auth.sign_in_settled', settled);
    expect(track).toHaveBeenNthCalledWith(3, 'auth.signed_out', signedOut);
    // No payload carries anything beyond a correlation id and, for the
    // settled event, its three-value outcome - never a user id, an email
    // or anything derived from a credential (invariants 125, 126).
    expect(Object.keys(started).sort()).toEqual(['correlationId']);
    expect(Object.keys(settled).sort()).toEqual(['correlationId', 'outcome']);
    expect(Object.keys(signedOut).sort()).toEqual(['correlationId']);
  });

  it('no auth vocabulary appears in an exported platform identifier', () => {
    const output = execFileSync(
      'node',
      [
        'scripts/assert-domain-vocabulary.mjs',
        'src/platform/observability/analyticsEvents.ts',
      ],
      { encoding: 'utf-8' },
    );

    expect(output).toBe('');
  });
});
