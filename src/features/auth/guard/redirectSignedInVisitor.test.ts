import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ObservabilityFacade } from '@platform/observability';
import type { KeyValueStorage } from '@platform/runtime';
import { userIdentifier } from '../domain';
import { writeSession } from '../session';
import { redirectSignedInVisitor } from './redirectSignedInVisitor';

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

function createMapStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    read: (key) => map.get(key) ?? null,
    write: (key, value) => {
      map.set(key, value);
      return true;
    },
    remove: (key) => {
      map.delete(key);
    },
  };
}

function throwsResponse(callback: () => unknown): Response {
  try {
    callback();
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }
  throw new Error(
    'expected redirectSignedInVisitor to throw a redirect Response',
  );
}

afterEach(() => {
  window.history.pushState({}, '', '/');
});

describe('redirectSignedInVisitor', () => {
  it('sends a signed-in visitor to the from target or the hierarchy route', () => {
    const observability = createSpyObservability();
    const emptyStorage = createMapStorage();

    window.history.pushState({}, '', '/login');
    const noSessionResult = redirectSignedInVisitor({
      request: new Request('https://example.test/login'),
      tabStorage: emptyStorage,
      observability,
    });
    expect(noSessionResult).toBeNull();

    const signedInStorage = createMapStorage();
    writeSession(signedInStorage, observability, userIdentifier('user-1'));

    window.history.pushState({}, '', '/login?from=%2Fhierarchy%2Fusers%2F5');
    const withFromResponse = throwsResponse(() =>
      redirectSignedInVisitor({
        request: new Request(
          'https://example.test/login?from=%2Fhierarchy%2Fusers%2F5',
        ),
        tabStorage: signedInStorage,
        observability,
      }),
    );
    expect(withFromResponse.headers.get('Location')).toBe('/hierarchy/users/5');

    window.history.pushState({}, '', '/login');
    const withoutFromResponse = throwsResponse(() =>
      redirectSignedInVisitor({
        request: new Request('https://example.test/login'),
        tabStorage: signedInStorage,
        observability,
      }),
    );
    expect(withoutFromResponse.headers.get('Location')).toBe('/');
  });
});
