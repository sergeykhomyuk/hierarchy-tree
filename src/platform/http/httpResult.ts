import type { HttpFailure } from './httpFailure';

export const HttpResultOutcome = {
  Success: 'success',
  Failure: 'failure',
  Cancelled: 'cancelled',
} as const;

export type HttpResultOutcome =
  (typeof HttpResultOutcome)[keyof typeof HttpResultOutcome];

export type HttpResult<Value> =
  | { outcome: typeof HttpResultOutcome.Success; value: Value; status: number }
  | { outcome: typeof HttpResultOutcome.Failure; failure: HttpFailure }
  | { outcome: typeof HttpResultOutcome.Cancelled };
