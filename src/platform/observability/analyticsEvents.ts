import type { SignInOutcome } from './signInOutcome';
import type { WebVitalMetricName } from './webVitalMetricName';

export type AnalyticsPayloads = {
  'app.route_viewed': { routeId: string };
  'app.error_boundary_shown': { correlationId: string };
  'app.web_vital': { metric: WebVitalMetricName; value: number };
  'auth.sign_in_started': { correlationId: string };
  'auth.sign_in_settled': { correlationId: string; outcome: SignInOutcome };
  'auth.signed_out': { correlationId: string };
};

export type AnalyticsEventName = keyof AnalyticsPayloads;
