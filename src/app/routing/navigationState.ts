export const NavigationState = {
  Idle: 'idle',
  Loading: 'loading',
  Submitting: 'submitting',
} as const;

export type NavigationState =
  (typeof NavigationState)[keyof typeof NavigationState];
