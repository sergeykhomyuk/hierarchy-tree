export type AnalyticsPayloads = {
  'app.route_viewed': { routeId: string };
  'app.error_boundary_shown': { correlationId: string };
  'app.web_vital': { metric: 'LCP' | 'INP' | 'CLS'; value: number };
};

export type AnalyticsEventName = keyof AnalyticsPayloads;
