export const HttpFailureKind = {
  Network: 'network',
  Timeout: 'timeout',
  Http: 'http',
  Parse: 'parse',
} as const;

export type HttpFailureKind =
  (typeof HttpFailureKind)[keyof typeof HttpFailureKind];

export type HttpFailure =
  | { kind: typeof HttpFailureKind.Network }
  | { kind: typeof HttpFailureKind.Timeout; timeoutMilliseconds: number }
  | {
      kind: typeof HttpFailureKind.Http;
      status: number;
      statusDescription: string;
    }
  | { kind: typeof HttpFailureKind.Parse };
