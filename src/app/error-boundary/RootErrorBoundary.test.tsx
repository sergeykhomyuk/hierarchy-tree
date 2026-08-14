import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ApplicationRoot } from '../ApplicationRoot';
import { buildTestRuntime, renderRoute } from '../testing/renderRoute';

function Bomb(): never {
  throw new Error('boom');
}

describe('RootErrorBoundary', () => {
  it('the root boundary renders the error surface above any router without throwing', async () => {
    await expect(renderRoute(<Bomb />)).resolves.toBeDefined();

    expect(screen.getByText('errorSurface.title')).toBeInTheDocument();
  });

  it('the boundary reports the error exactly once and displays the correlation id', async () => {
    const runtime = await buildTestRuntime();
    runtime.interactionTracker.attach({ subscribe: () => () => {} });
    const activeCorrelationId =
      runtime.interactionTracker.currentCorrelationId();
    expect(activeCorrelationId).not.toBeNull();
    const trackSpy = vi.spyOn(runtime.observability.analytics, 'track');

    render(
      <ApplicationRoot runtime={runtime}>
        <Bomb />
      </ApplicationRoot>,
    );

    expect(trackSpy).toHaveBeenCalledTimes(1);
    expect(trackSpy).toHaveBeenCalledWith('app.error_boundary_shown', {
      correlationId: activeCorrelationId,
    });
    expect(screen.getByText(activeCorrelationId ?? '')).toBeInTheDocument();
  });
});
