export type TimingRecord = {
  method: string;
  resourcePath: string;
  outcome: 'success' | 'failure';
  status?: number;
  durationMilliseconds: number;
  correlationId: string;
  attempt: number;
  requestId: string;
};
