export const RevalidationState = {
  Idle: 'idle',
  Loading: 'loading',
} as const;

export type RevalidationState =
  (typeof RevalidationState)[keyof typeof RevalidationState];
