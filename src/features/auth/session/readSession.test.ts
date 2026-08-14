import { describe, expect, it, vi } from 'vitest';
import type { KeyValueStorage } from '@platform/runtime';
import type { ObservabilityFacade } from '@platform/observability';
import { userIdentifier } from '../domain/userIdentifier';
import { readSession } from './readSession';
import { writeSession } from './writeSession';
import { SESSION_SCHEMA_VERSION } from './sessionRecord';
import { SESSION_STORAGE_KEY } from './sessionStorageKey';

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

describe('readSession', () => {
  it('returns the signed-in view for a well-formed record', () => {
    const storage = createMapStorage();
    const observability = createSpyObservability();
    storage.write(
      SESSION_STORAGE_KEY,
      JSON.stringify({ version: SESSION_SCHEMA_VERSION, userId: 'user_1' }),
    );

    expect(readSession(storage, observability)).toEqual({
      status: 'signedIn',
      userId: 'user_1',
    });
  });

  it('treats an unparseable, id-less or wrong-version record as no session and removes it', () => {
    const observability = createSpyObservability();
    const cases = [
      'not json',
      JSON.stringify({ version: SESSION_SCHEMA_VERSION }),
      JSON.stringify({ version: SESSION_SCHEMA_VERSION + 1, userId: 'u' }),
    ];

    for (const raw of cases) {
      const storage = createMapStorage();
      storage.write(SESSION_STORAGE_KEY, raw);

      expect(readSession(storage, observability)).toEqual({
        status: 'signedOut',
      });
      expect(storage.read(SESSION_STORAGE_KEY)).toBe(null);
    }
  });

  it('prefers the in-page shadow over a stale valid record left by a failed write', () => {
    const observability = createSpyObservability();
    let persistSucceeds = true;
    const map = new Map<string, string>();
    const storage: KeyValueStorage = {
      read: (key) => map.get(key) ?? null,
      write: (key, value) => {
        if (!persistSucceeds) return false;
        map.set(key, value);
        return true;
      },
      remove: (key) => {
        map.delete(key);
      },
    };

    writeSession(storage, observability, userIdentifier('user_old'));
    persistSucceeds = false;
    writeSession(storage, observability, userIdentifier('user_new'));

    // Storage still holds the OLD record (the second write's persist
    // failed), but the shadow - set before the failed persist attempt -
    // must win.
    expect(JSON.parse(map.get(SESSION_STORAGE_KEY) ?? 'null')).toEqual({
      version: SESSION_SCHEMA_VERSION,
      userId: 'user_old',
    });
    expect(readSession(storage, observability)).toEqual({
      status: 'signedIn',
      userId: 'user_new',
    });
  });
});
