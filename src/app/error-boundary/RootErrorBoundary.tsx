import { Component, type ReactNode } from 'react';
import type { Runtime } from '../composition';
import { ErrorSurface } from './ErrorSurface';
import { reportRootError } from './reportRootError';

type RootErrorBoundaryProps = {
  runtime: Runtime;
  children: ReactNode;
};

type RootErrorBoundaryState = {
  hasError: boolean;
  correlationId: string | null;
};

// Catches everything RouteErrorBoundary can't - it renders above
// RouterProvider, so useNavigate() is unavailable here; recovery is a
// full document load back to the app root instead.
export class RootErrorBoundary extends Component<
  RootErrorBoundaryProps,
  RootErrorBoundaryState
> {
  override state: RootErrorBoundaryState = {
    hasError: false,
    correlationId: null,
  };

  static getDerivedStateFromError(): Partial<RootErrorBoundaryState> {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown): void {
    const correlationId = reportRootError(error, {
      observability: this.props.runtime.observability,
      interactionTracker: this.props.runtime.interactionTracker,
    });
    this.setState({ correlationId });
  }

  private handleRecover = (): void => {
    window.location.assign(this.props.runtime.configuration.basePath);
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <ErrorSurface
          correlationId={this.state.correlationId ?? ''}
          onRecover={this.handleRecover}
        />
      );
    }
    return this.props.children;
  }
}
