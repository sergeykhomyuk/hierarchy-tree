import type { KeyValueStorage } from './keyValueStorage';

const ABSENT_STORAGE: KeyValueStorage = {
  read: () => null,
  write: () => false,
  remove: () => {},
};

// The one module that touches sessionStorage. The property access itself
// is wrapped, not only the calls: a browser with storage denied throws on
// the access before any method is reachable (invariant 78).
export function createTabStorage(): KeyValueStorage {
  let storage: Storage;
  try {
    storage = sessionStorage;
  } catch {
    return ABSENT_STORAGE;
  }
  if (storage === undefined) {
    return ABSENT_STORAGE;
  }

  return {
    read(key: string): string | null {
      try {
        return storage.getItem(key);
      } catch {
        return null;
      }
    },
    write(key: string, value: string): boolean {
      try {
        storage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    },
    remove(key: string): void {
      try {
        storage.removeItem(key);
      } catch {
        // Best-effort: the in-page shadow (session/sessionShadow.ts)
        // stays authoritative even when the removal itself fails.
      }
    },
  };
}
