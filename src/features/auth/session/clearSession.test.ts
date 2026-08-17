import { describe, expect, it, vi } from 'vitest';
import type { KeyValueStorage } from '@platform/runtime';
import type { ObservabilityFacade } from '@platform/observability';
import { userIdentifier } from '../domain';
import { clearSession } from './clearSession';
import { readSession } from './readSession';
import { writeSession } from './writeSession';
import { SESSION_STORAGE_KEY } from './sessionStorageKey';

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

describe('clearSession', () => {
  it('reports no session after a failed removal rather than the cleared record', () => {
    const observability = createSpyObservability();
    const map = new Map<string, string>();
    const storage: KeyValueStorage = {
      read: (key) => map.get(key) ?? null,
      write: (key, value) => {
        map.set(key, value);
        return true;
      },
      remove: () => {
        // Simulates a failed removal: the key is left behind in storage.
      },
    };

    writeSession(storage, observability, userIdentifier('user_1'));
    clearSession(storage);

    // Storage still holds the record (the "failed" removal above), but
    // the tombstoned shadow must still report signed out.
    expect(map.get(SESSION_STORAGE_KEY)).not.toBe(undefined);
    expect(readSession(storage, observability)).toEqual({
      status: 'signedOut',
    });
  });
});
