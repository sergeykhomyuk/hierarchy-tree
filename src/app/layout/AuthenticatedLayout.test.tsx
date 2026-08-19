import { describe, expect, it, vi } from 'vitest';
import type { LoaderFunctionArgs } from 'react-router';
import type { ObservabilityFacade } from '@platform/observability';
import type { KeyValueStorage } from '@platform/runtime';
import type { SignedInUserStore, SignedInUserView } from '@features/auth';
import { createAuthenticatedLoader } from './createAuthenticatedLoader';

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

// A record shaped as readSession expects, handed straight back regardless
// of the storage key requested - no need to reach the feature's private
// SESSION_STORAGE_KEY literal or writeSession from app/layout/.
function createSignedInStorage(userId: string): KeyValueStorage {
  const record = JSON.stringify({ version: 1, userId });
  return { read: () => record, write: () => true, remove: () => {} };
}

describe('AuthenticatedLayout', () => {
  it('returns the signed-in user promise without awaiting it', () => {
    const userPromise: Promise<SignedInUserView | null> = Promise.resolve({
      displayName: 'Ada Lovelace',
    });
    const readSpy = vi.fn(() => userPromise);
    const signedInUserStore: SignedInUserStore = { read: readSpy };
    const loader = createAuthenticatedLoader({
      tabStorage: createSignedInStorage('user-1'),
      observability: createSpyObservability(),
      signedInUserStore,
    });

    const result = loader({
      request: new Request('https://example.test/'),
    } as LoaderFunctionArgs);

    expect(result.signedInUser).toBe(userPromise);
    expect(readSpy).toHaveBeenCalledWith('user-1');
  });

  it('the authenticated loader returns the signed-in userId alongside signedInUser', () => {
    const signedInUserStore: SignedInUserStore = {
      read: () => Promise.resolve(null),
    };
    const loader = createAuthenticatedLoader({
      tabStorage: createSignedInStorage('user-1'),
      observability: createSpyObservability(),
      signedInUserStore,
    });

    const result = loader({
      request: new Request('https://example.test/'),
    } as LoaderFunctionArgs);

    expect(result.userId).toBe('user-1');
  });
});
