export const LoginResultOutcome = {
  Untouched: 'untouched',
  NoMatch: 'noMatch',
  ServiceProblem: 'serviceProblem',
} as const;

export type LoginResultOutcome =
  (typeof LoginResultOutcome)[keyof typeof LoginResultOutcome];

export type LoginResult =
  | { outcome: typeof LoginResultOutcome.Untouched }
  | { outcome: typeof LoginResultOutcome.NoMatch }
  | {
      outcome: typeof LoginResultOutcome.ServiceProblem;
      correlationId: string;
    };

export const LoginCardStateKind = {
  Idle: 'idle',
  Ready: 'ready',
  Submitting: 'submitting',
  NoMatch: 'noMatch',
  ServiceProblem: 'serviceProblem',
} as const;

export type LoginCardStateKind =
  (typeof LoginCardStateKind)[keyof typeof LoginCardStateKind];

export type LoginCardState =
  | { kind: typeof LoginCardStateKind.Idle }
  | { kind: typeof LoginCardStateKind.Ready }
  | { kind: typeof LoginCardStateKind.Submitting }
  | { kind: typeof LoginCardStateKind.NoMatch }
  | { kind: typeof LoginCardStateKind.ServiceProblem; correlationId: string };

// The five presented states as one derived value rather than ad-hoc
// booleans (invariant 29). isPending wins over a settled result: while
// an attempt is in flight - including a retry re-derivation - the card is
// submitting regardless of what the previous result was.
export function loginCardState(
  result: LoginResult,
  isPending: boolean,
  isReady: boolean,
): LoginCardState {
  if (isPending) return { kind: LoginCardStateKind.Submitting };
  if (result.outcome === LoginResultOutcome.NoMatch) {
    return { kind: LoginCardStateKind.NoMatch };
  }
  if (result.outcome === LoginResultOutcome.ServiceProblem) {
    return {
      kind: LoginCardStateKind.ServiceProblem,
      correlationId: result.correlationId,
    };
  }
  return isReady
    ? { kind: LoginCardStateKind.Ready }
    : { kind: LoginCardStateKind.Idle };
}
