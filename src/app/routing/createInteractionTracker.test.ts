import { describe, expect, it, vi } from 'vitest';
import { createInteractionTracker } from './createInteractionTracker';
import type { Router, RouterState } from './createInteractionTracker';

function createFakeRouter(): {
  router: Router;
  emit: (state: RouterState) => void;
} {
  let listener: ((state: RouterState) => void) | undefined;
  const router: Router = {
    subscribe: (nextListener) => {
      listener = nextListener;
      return () => {
        listener = undefined;
      };
    },
  };
  return {
    router,
    emit: (state) => listener?.(state),
  };
}

function createSpyObservability() {
  let nextId = 0;
  return {
    tracer: {
      recordTiming: vi.fn(),
      startInteraction: vi.fn(() => {
        nextId += 1;
        return `correlation-${nextId}`.padStart(32, '0');
      }),
    },
    analytics: { track: vi.fn() },
  };
}

const IDLE_SUCCESS: RouterState = {
  navigation: { state: 'idle' },
  matches: [{ route: { id: 'home' } }],
  errors: null,
};

const LOADING: RouterState = {
  navigation: { state: 'loading' },
  matches: [{ route: { id: 'home' } }],
  errors: null,
};

const IDLE_ERROR: RouterState = {
  navigation: { state: 'idle' },
  matches: [{ route: { id: 'home' } }],
  errors: { home: new Error('boom') },
};

describe('createInteractionTracker', () => {
  it('a new correlation id is issued per navigation including the initial load', () => {
    const observability = createSpyObservability();
    const tracker = createInteractionTracker(observability);
    const { router, emit } = createFakeRouter();

    tracker.attach(router);
    const initialId = tracker.currentCorrelationId();
    expect(initialId).not.toBeNull();

    emit(IDLE_SUCCESS);
    emit(LOADING);
    const secondId = tracker.currentCorrelationId();

    expect(secondId).not.toBeNull();
    expect(secondId).not.toBe(initialId);
    expect(observability.tracer.startInteraction).toHaveBeenCalledTimes(2);
  });

  it('emits exactly one route_viewed for the initial load once it settles', () => {
    const observability = createSpyObservability();
    const tracker = createInteractionTracker(observability);
    const { router, emit } = createFakeRouter();

    tracker.attach(router);
    emit(IDLE_SUCCESS);

    expect(observability.analytics.track).toHaveBeenCalledTimes(1);
    expect(observability.analytics.track).toHaveBeenCalledWith(
      'app.route_viewed',
      {
        routeId: 'home',
      },
    );
  });

  it('a failed navigation emits no route_viewed', () => {
    const observability = createSpyObservability();
    const tracker = createInteractionTracker(observability);
    const { router, emit } = createFakeRouter();

    tracker.attach(router);
    emit(IDLE_SUCCESS);
    observability.analytics.track.mockClear();

    emit(LOADING);
    emit(IDLE_ERROR);

    expect(observability.analytics.track).not.toHaveBeenCalled();
  });

  it('detach stops the tracker from receiving further router state', () => {
    const observability = createSpyObservability();
    const tracker = createInteractionTracker(observability);
    const { router, emit } = createFakeRouter();

    const detach = tracker.attach(router);
    emit(IDLE_SUCCESS);
    detach();
    observability.analytics.track.mockClear();

    emit(LOADING);
    emit(IDLE_SUCCESS);

    expect(observability.analytics.track).not.toHaveBeenCalled();
  });

  it('emits no route_viewed when the settled state matches no route', () => {
    const observability = createSpyObservability();
    const tracker = createInteractionTracker(observability);
    const { router, emit } = createFakeRouter();

    tracker.attach(router);
    emit({ navigation: { state: 'idle' }, matches: [], errors: null });

    expect(observability.analytics.track).not.toHaveBeenCalled();
  });

  it('ignores a redundant idle notification while not tracking a navigation', () => {
    const observability = createSpyObservability();
    const tracker = createInteractionTracker(observability);
    const { router, emit } = createFakeRouter();

    tracker.attach(router);
    emit(IDLE_SUCCESS);
    observability.analytics.track.mockClear();

    emit(IDLE_SUCCESS);

    expect(observability.analytics.track).not.toHaveBeenCalled();
  });

  it('beginInteraction opens an interaction without emitting a route_viewed', () => {
    const observability = createSpyObservability();
    const tracker = createInteractionTracker(observability);

    const id = tracker.beginInteraction();

    expect(id).not.toBeNull();
    expect(observability.analytics.track).not.toHaveBeenCalled();
  });

  it('endInteraction lets the next navigation mint a fresh id instead of reusing an interaction beginInteraction opened', () => {
    const observability = createSpyObservability();
    const tracker = createInteractionTracker(observability);
    const { router, emit } = createFakeRouter();

    tracker.attach(router);
    emit(IDLE_SUCCESS);
    const abandonedId = tracker.beginInteraction();
    tracker.endInteraction();

    emit(LOADING);
    const nextId = tracker.currentCorrelationId();

    expect(nextId).not.toBe(abandonedId);
  });

  it('shouldReportPrimitive is true the first time a key is seen and false after', () => {
    const observability = createSpyObservability();
    const tracker = createInteractionTracker(observability);

    expect(tracker.shouldReportPrimitive('string:boom')).toBe(true);
    expect(tracker.shouldReportPrimitive('string:boom')).toBe(false);
    expect(tracker.shouldReportPrimitive('object:null')).toBe(true);
  });

  it('a new interaction clears which primitive keys were already reported', () => {
    const observability = createSpyObservability();
    const tracker = createInteractionTracker(observability);
    const { router, emit } = createFakeRouter();

    expect(tracker.shouldReportPrimitive('string:boom')).toBe(true);
    expect(tracker.shouldReportPrimitive('string:boom')).toBe(false);

    tracker.attach(router);
    emit(IDLE_SUCCESS);
    emit(LOADING);

    expect(tracker.shouldReportPrimitive('string:boom')).toBe(true);
  });
});
