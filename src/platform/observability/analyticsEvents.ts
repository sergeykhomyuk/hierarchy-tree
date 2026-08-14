import type { WebVitalMetricName } from './webVitalMetricName';

export type AnalyticsPayloads = {
  'app.route_viewed': { routeId: string };
  'app.error_boundary_shown': { correlationId: string };
  'app.web_vital': { metric: WebVitalMetricName; value: number };
};

export type AnalyticsEventName = keyof AnalyticsPayloads;
