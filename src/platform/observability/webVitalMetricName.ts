export const WebVitalMetricName = {
  LCP: 'LCP',
  INP: 'INP',
  CLS: 'CLS',
} as const;

export type WebVitalMetricName =
  (typeof WebVitalMetricName)[keyof typeof WebVitalMetricName];
