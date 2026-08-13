export type TimingRecord = {
  method: string;
  resourcePath: string;
  outcome: 'success' | 'failure' | 'cancelled';
  status?: number;
  durationMilliseconds: number;
  correlationId: string;
  attempt: number;
  requestId: string;
};
