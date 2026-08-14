import { onCLS, onINP, onLCP } from 'web-vitals';
import type { Metric } from 'web-vitals';
import type { ObservabilityFacade } from './observabilityFacade';

type Analytics = ObservabilityFacade['analytics'];
type WebVitalMetricName = 'LCP' | 'INP' | 'CLS';

export function reportWebVitals(analytics: Analytics): void {
  if (typeof PerformanceObserver !== 'function') return;

  try {
    onLCP((metric) => reportMetric(analytics, 'LCP', metric));
    onINP((metric) => reportMetric(analytics, 'INP', metric));
    onCLS((metric) => reportMetric(analytics, 'CLS', metric));
  } catch {
    // invariant 53: an unsupported PerformanceObserver or entry type
    // degrades silently rather than throwing or logging.
  }
}

function reportMetric(
  analytics: Analytics,
  metricName: WebVitalMetricName,
  metric: Metric,
): void {
  analytics.track('app.web_vital', { metric: metricName, value: metric.value });
}
