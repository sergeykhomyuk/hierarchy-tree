export type HttpFailure =
  | { kind: 'network' }
  | { kind: 'timeout'; timeoutMilliseconds: number }
  | { kind: 'http'; status: number; statusDescription: string }
  | { kind: 'parse' };
