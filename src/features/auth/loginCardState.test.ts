import { describe, expect, it } from 'vitest';
import { loginCardState } from './loginCardState';

describe('loginCardState', () => {
  it('derives idle, ready, submitting, no-match and service-problem from the result and pending flags', () => {
    expect(loginCardState({ outcome: 'untouched' }, false, false)).toEqual({
      kind: 'idle',
    });
    expect(loginCardState({ outcome: 'untouched' }, false, true)).toEqual({
      kind: 'ready',
    });
    expect(loginCardState({ outcome: 'untouched' }, true, false)).toEqual({
      kind: 'submitting',
    });
    expect(loginCardState({ outcome: 'untouched' }, true, true)).toEqual({
      kind: 'submitting',
    });
    expect(loginCardState({ outcome: 'noMatch' }, false, false)).toEqual({
      kind: 'noMatch',
    });
    expect(loginCardState({ outcome: 'noMatch' }, false, true)).toEqual({
      kind: 'noMatch',
    });
    expect(
      loginCardState(
        { outcome: 'serviceProblem', correlationId: 'c'.repeat(32) },
        false,
        false,
      ),
    ).toEqual({ kind: 'serviceProblem', correlationId: 'c'.repeat(32) });
    // isPending wins over a settled result: a retry's dispatch is
    // submitting before the previous alert is cleared from view.
    expect(
      loginCardState(
        { outcome: 'serviceProblem', correlationId: 'c'.repeat(32) },
        true,
        true,
      ),
    ).toEqual({ kind: 'submitting' });
  });
});
