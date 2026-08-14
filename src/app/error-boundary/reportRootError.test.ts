import { describe, expect, it, vi } from 'vitest';
import { createInteractionTracker } from '../routing';
import { reportRootError } from './reportRootError';

function createFakeObservability(startInteractionId = 'fresh-id') {
  return {
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    tracer: {
      recordTiming: vi.fn(),
      startInteraction: vi.fn(() => startInteractionId),
    },
    analytics: { track: vi.fn() },
  };
}

describe('reportRootError', () => {
  it('reports an object error once, using the active interaction correlation id', () => {
    const observability = createFakeObservability();
    const interactionTracker = createInteractionTracker(observability);
    interactionTracker.attach({ subscribe: () => () => {} });
    const activeId = interactionTracker.currentCorrelationId();
    const error = new Error('boom');

    const correlationId = reportRootError(error, {
      observability,
      interactionTracker,
    });

    expect(correlationId).toBe(activeId);
    expect(observability.analytics.track).toHaveBeenCalledTimes(1);
    expect(observability.analytics.track).toHaveBeenCalledWith(
      'app.error_boundary_shown',
      { correlationId: activeId },
    );
  });

  it('reports the same object error only once across repeated calls', () => {
    const observability = createFakeObservability();
    const interactionTracker = createInteractionTracker(observability);
    interactionTracker.attach({ subscribe: () => () => {} });
    const error = new Error('boom');

    reportRootError(error, { observability, interactionTracker });
    reportRootError(error, { observability, interactionTracker });

    expect(observability.analytics.track).toHaveBeenCalledTimes(1);
  });

  it('reports a primitive throw (string) exactly once without touching a WeakSet', () => {
    const observability = createFakeObservability();
    const interactionTracker = createInteractionTracker(observability);
    interactionTracker.attach({ subscribe: () => () => {} });

    expect(() =>
      reportRootError('boom', { observability, interactionTracker }),
    ).not.toThrow();
    reportRootError('boom', { observability, interactionTracker });

    expect(observability.analytics.track).toHaveBeenCalledTimes(1);
  });

  it('reports a null throw exactly once', () => {
    const observability = createFakeObservability();
    const interactionTracker = createInteractionTracker(observability);
    interactionTracker.attach({ subscribe: () => () => {} });

    expect(() =>
      reportRootError(null, { observability, interactionTracker }),
    ).not.toThrow();
    reportRootError(null, { observability, interactionTracker });

    expect(observability.analytics.track).toHaveBeenCalledTimes(1);
  });

  it('falls back to a fresh correlation id when no interaction is active', () => {
    const observability = createFakeObservability('fallback-id');
    const interactionTracker = createInteractionTracker(observability);
    expect(interactionTracker.currentCorrelationId()).toBeNull();

    const correlationId = reportRootError(new Error('boom'), {
      observability,
      interactionTracker,
    });

    expect(correlationId).toBe('fallback-id');
  });
});
