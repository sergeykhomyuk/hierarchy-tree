import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ObservabilityFacade } from '@platform/observability';
import type { KeyValueStorage } from '@platform/runtime';
import { requireSession } from './requireSession';

function createSpyObservability(): ObservabilityFacade {
  return {
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    tracer: {
      recordTiming: vi.fn(),
      startInteraction: vi.fn(() => 'a'.repeat(32)),
    },
    analytics: { track: vi.fn() },
  };
}

function createEmptyStorage(): KeyValueStorage {
  return { read: () => null, write: () => true, remove: () => {} };
}

function throwsResponse(callback: () => unknown): Response {
  try {
    callback();
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }
  throw new Error('expected requireSession to throw a redirect Response');
}

afterEach(() => {
  window.history.pushState({}, '', '/');
});

describe('requireSession', () => {
  it('redirects a visitor with no session to the login route carrying from', () => {
    window.history.pushState({}, '', '/hierarchy/users/5?a=1');
    const observability = createSpyObservability();
    const tabStorage = createEmptyStorage();
    const request = new Request('https://example.test/hierarchy/users/5?a=1');

    const response = throwsResponse(() =>
      requireSession({ request, tabStorage, observability }),
    );

    expect(response.headers.get('Location')).toBe(
      '/login?from=%2Fhierarchy%2Fusers%2F5%3Fa%3D1',
    );
  });

  it('replaces the current entry on a direct load and pushes on an in-app navigation', () => {
    const observability = createSpyObservability();
    const tabStorage = createEmptyStorage();

    window.history.pushState({}, '', '/hierarchy/users/5');
    const directLoadResponse = throwsResponse(() =>
      requireSession({
        request: new Request('https://example.test/hierarchy/users/5'),
        tabStorage,
        observability,
      }),
    );
    expect(directLoadResponse.headers.get('X-Remix-Replace')).toBe('true');

    window.history.pushState({}, '', '/somewhere-else');
    const pushResponse = throwsResponse(() =>
      requireSession({
        request: new Request('https://example.test/hierarchy/users/5'),
        tabStorage,
        observability,
      }),
    );
    expect(pushResponse.headers.get('X-Remix-Replace')).toBeNull();
  });
});
