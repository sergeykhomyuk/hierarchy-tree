import type { ObservabilityFacade } from '@platform/observability';
import type { InteractionTracker } from '../routing';

// Object identity is tracked globally rather than per instance - identity
// is global, and a WeakSet self-empties, so no explicit lifecycle owns it.
// This is what survives StrictMode's double-invoked effects: a useRef
// guard does not, because the component mounts twice.
const reportedObjects = new WeakSet<object>();

export type ReportRootErrorDependencies = {
  observability: Pick<ObservabilityFacade, 'logger' | 'tracer' | 'analytics'>;
  interactionTracker: InteractionTracker;
};

export function reportRootError(
  error: unknown,
  { observability, interactionTracker }: ReportRootErrorDependencies,
): string {
  const correlationId =
    interactionTracker.currentCorrelationId() ??
    observability.tracer.startInteraction();

  if (!shouldReport(error, interactionTracker)) {
    return correlationId;
  }

  observability.logger.error('app.error_boundary_shown', {
    correlationId,
    message: error instanceof Error ? error.message : String(error),
  });
  observability.analytics.track('app.error_boundary_shown', {
    correlationId,
  });

  return correlationId;
}

// WeakSet.add throws TypeError on a primitive, which is reachable here:
// `throw 'boom'`, `throw null` and a promise rejected with a primitive
// all occur, from third-party code and from React Router's own thrown
// responses.
function shouldReport(
  error: unknown,
  interactionTracker: InteractionTracker,
): boolean {
  if (typeof error === 'object' && error !== null) {
    if (reportedObjects.has(error)) return false;
    reportedObjects.add(error);
    return true;
  }
  return interactionTracker.shouldReportPrimitive(
    `${typeof error}:${String(error)}`,
  );
}
