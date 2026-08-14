export type LoginResult =
  | { outcome: 'untouched' }
  | { outcome: 'noMatch' }
  | { outcome: 'serviceProblem'; correlationId: string };

export type LoginCardState =
  | { kind: 'idle' }
  | { kind: 'ready' }
  | { kind: 'submitting' }
  | { kind: 'noMatch' }
  | { kind: 'serviceProblem'; correlationId: string };

// The five presented states as one derived value rather than ad-hoc
// booleans (invariant 29). isPending wins over a settled result: while
// an attempt is in flight - including a retry re-derivation - the card is
// submitting regardless of what the previous result was.
export function loginCardState(
  result: LoginResult,
  isPending: boolean,
  isReady: boolean,
): LoginCardState {
  if (isPending) return { kind: 'submitting' };
  if (result.outcome === 'noMatch') return { kind: 'noMatch' };
  if (result.outcome === 'serviceProblem') {
    return { kind: 'serviceProblem', correlationId: result.correlationId };
  }
  return isReady ? { kind: 'ready' } : { kind: 'idle' };
}
