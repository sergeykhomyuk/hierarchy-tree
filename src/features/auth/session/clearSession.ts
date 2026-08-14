import type { KeyValueStorage } from '@platform/runtime';
import { clearShadow } from './sessionShadow';
import { SESSION_STORAGE_KEY } from './sessionStorageKey';

// The shadow is tombstoned BEFORE the removal attempt, so a failed
// removal still reports signed out rather than the stale record
// (invariant 79a).
export function clearSession(storage: KeyValueStorage): void {
  clearShadow(storage);
  storage.remove(SESSION_STORAGE_KEY);
}
