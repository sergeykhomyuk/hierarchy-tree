import type { HttpFailure } from './httpFailure';

export type HttpResult<Value> =
  | { outcome: 'success'; value: Value; status: number }
  | { outcome: 'failure'; failure: HttpFailure }
  | { outcome: 'cancelled' };
