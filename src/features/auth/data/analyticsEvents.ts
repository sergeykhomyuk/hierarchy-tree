import type { SignInOutcome } from './signInOutcome';

// Declaration merging targets the module that DECLARES AnalyticsPayloads,
// not the @platform/observability barrel that re-exports it - augmenting
// the barrel's re-exported binding merges nothing the facade can see
// (ARCHITECTURE.md's decision log).
declare module '@platform/observability/analyticsEvents' {
  interface AnalyticsPayloads {
    'auth.sign_in_started': {
      readonly correlationId: string;
    };
    // No user id, email or anything derived from a credential (invariants
    // 125, 126) - only the correlation id and the three-value outcome.
    'auth.sign_in_settled': {
      readonly correlationId: string;
      readonly outcome: SignInOutcome;
    };
    'auth.signed_out': {
      readonly correlationId: string;
    };
  }
}

export {};
