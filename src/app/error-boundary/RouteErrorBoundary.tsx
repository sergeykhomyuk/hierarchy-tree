import { memo } from 'react';
import { useNavigate, useRouteError } from 'react-router';
import { useRuntime } from '../composition/useRuntime';
import { ErrorSurface } from './ErrorSurface';
import { reportRootError } from './reportRootError';

// The root route's ErrorBoundary - catches a route render throw or loader
// rejection. Inside the router, so useNavigate() is legal here (unlike
// RootErrorBoundary): re-running the current route is the useful recovery.
export const RouteErrorBoundary = memo(function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  const runtime = useRuntime();
  const correlationId = reportRootError(error, {
    observability: runtime.observability,
    interactionTracker: runtime.interactionTracker,
  });

  return (
    <ErrorSurface
      correlationId={correlationId}
      onRecover={() => {
        void navigate(0);
      }}
    />
  );
});
