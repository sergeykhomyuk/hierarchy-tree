import { describe, expect, it } from 'vitest';
import { createTabStorage } from './createTabStorage';

// src/platform/**/*.test.ts runs under vitest's node environment (no
// jsdom, no window) - sessionStorage is stubbed directly on globalThis,
// the same object createTabStorage itself reads through.
function installFakeSessionStorage(): void {
  const store = new Map<string, string>();
  const fakeStorage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: () => null,
    removeItem: (key) => {
      store.delete(key);
    },
    setItem: (key, value) => {
      store.set(key, value);
    },
  };
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: fakeStorage,
  });
}

function removeSessionStorage(): void {
  Reflect.deleteProperty(globalThis, 'sessionStorage');
}

describe('createTabStorage', () => {
  it('reads, writes and clears through the tab-scoped store', () => {
    installFakeSessionStorage();

    try {
      const storage = createTabStorage();

      expect(storage.read('k')).toBe(null);
      expect(storage.write('k', 'v')).toBe(true);
      expect(storage.read('k')).toBe('v');
      storage.remove('k');
      expect(storage.read('k')).toBe(null);
    } finally {
      removeSessionStorage();
    }
  });

  it('reports unavailable storage as absent rather than throwing', () => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      get() {
        throw new DOMException('denied', 'SecurityError');
      },
    });

    try {
      const storage = createTabStorage();

      expect(storage.read('k')).toBe(null);
      expect(storage.write('k', 'v')).toBe(false);
      expect(() => storage.remove('k')).not.toThrow();
    } finally {
      removeSessionStorage();
    }
  });
});
