import type { SignInOutcome } from './signInOutcome';
import type { WebVitalMetricName } from './webVitalMetricName';

// An interface, not a type alias, so a feature can add its own event names
// and payload shapes by declaration merging without this file - or the
// platform layer - ever learning what those events mean (invariant 168).
// The augmentation must target this exact module path
// (@platform/observability/analyticsEvents), not the barrel that re-exports
// it: the barrel re-export creates a new binding the merge cannot reach.
export interface AnalyticsPayloads {
  'app.route_viewed': { routeId: string };
  'app.error_boundary_shown': { correlationId: string };
  'app.web_vital': { metric: WebVitalMetricName; value: number };
  'auth.sign_in_started': { correlationId: string };
  'auth.sign_in_settled': { correlationId: string; outcome: SignInOutcome };
  'auth.signed_out': { correlationId: string };
}

export type AnalyticsEventName = keyof AnalyticsPayloads;
