import type { KeyValueStorage } from '@platform/runtime';
import type { SessionRecord } from './sessionRecord';

// The in-page belief, authoritative over storage rather than a fallback
// (invariants 79, 79a): a failed write over an older valid record must not
// authenticate the previous user, and a failed removal must not let a
// just-signed-out visitor back in. Keyed by storage instance - the same
// trick loadTranslations.ts uses - so it is per-runtime and every test
// building its own runtime is isolated with no reset hook.
export type SessionShadow =
  | { status: 'unset' }
  | { status: 'set'; record: SessionRecord }
  | { status: 'cleared' };

const shadows = new WeakMap<KeyValueStorage, SessionShadow>();

export function readShadow(storage: KeyValueStorage): SessionShadow {
  return shadows.get(storage) ?? { status: 'unset' };
}

export function setShadow(
  storage: KeyValueStorage,
  record: SessionRecord,
): void {
  shadows.set(storage, { status: 'set', record });
}

export function clearShadow(storage: KeyValueStorage): void {
  shadows.set(storage, { status: 'cleared' });
}
