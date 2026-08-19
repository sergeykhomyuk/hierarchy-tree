export const SignInOutcome = {
  SignedIn: 'signedIn',
  NoMatch: 'noMatch',
  ServiceProblem: 'serviceProblem',
} as const;

export type SignInOutcome = (typeof SignInOutcome)[keyof typeof SignInOutcome];
