import type { KeyValueStorage } from '@platform/runtime';
import type { SessionRecord } from './sessionRecord';

export const SessionShadowStatus = {
  Unset: 'unset',
  Set: 'set',
  Cleared: 'cleared',
} as const;

export type SessionShadowStatus =
  (typeof SessionShadowStatus)[keyof typeof SessionShadowStatus];

// The in-page belief, authoritative over storage rather than a fallback
// (invariants 79, 79a): a failed write over an older valid record must not
// authenticate the previous user, and a failed removal must not let a
// just-signed-out visitor back in. Keyed by storage instance - the same
// trick loadTranslations.ts uses - so it is per-runtime and every test
// building its own runtime is isolated with no reset hook.
export type SessionShadow =
  | { status: typeof SessionShadowStatus.Unset }
  | { status: typeof SessionShadowStatus.Set; record: SessionRecord }
  | { status: typeof SessionShadowStatus.Cleared };

const shadows = new WeakMap<KeyValueStorage, SessionShadow>();

export function readShadow(storage: KeyValueStorage): SessionShadow {
  return shadows.get(storage) ?? { status: SessionShadowStatus.Unset };
}

export function setShadow(
  storage: KeyValueStorage,
  record: SessionRecord,
): void {
  shadows.set(storage, { status: SessionShadowStatus.Set, record });
}

export function clearShadow(storage: KeyValueStorage): void {
  shadows.set(storage, { status: SessionShadowStatus.Cleared });
}
