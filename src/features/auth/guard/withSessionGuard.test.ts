import { describe, expect, it, vi } from 'vitest';
import type { ObservabilityFacade } from '@platform/observability';
import type { KeyValueStorage } from '@platform/runtime';
import { userIdentifier } from '../domain/userIdentifier';
import { writeSession } from '../session/writeSession';
import { isSessionGuarded, withSessionGuard } from './withSessionGuard';

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

describe('withSessionGuard', () => {
  it('runs the session check before the wrapped loader and skips it entirely on redirect', () => {
    const observability = createSpyObservability();
    const innerLoader = vi.fn(() => 'inner-result');

    const signedOutGuarded = withSessionGuard(
      { tabStorage: createMapStorage(), observability },
      innerLoader,
    );

    let thrown: unknown;
    try {
      signedOutGuarded({ request: new Request('https://example.test/') });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect(innerLoader).not.toHaveBeenCalled();

    const signedInStorage = createMapStorage();
    writeSession(signedInStorage, observability, userIdentifier('user-1'));
    const signedInGuarded = withSessionGuard(
      { tabStorage: signedInStorage, observability },
      innerLoader,
    );

    const result = signedInGuarded({
      request: new Request('https://example.test/'),
    });

    expect(result).toBe('inner-result');
    expect(innerLoader).toHaveBeenCalledTimes(1);
    expect(isSessionGuarded(signedInGuarded)).toBe(true);
    expect(isSessionGuarded(innerLoader)).toBe(false);
  });
});
