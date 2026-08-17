import type { KeyValueStorage } from '@platform/runtime';
import type { ObservabilityFacade } from '@platform/observability';
import { userIdentifier, type UserIdentifier } from '../domain';
import { SESSION_SCHEMA_VERSION } from './sessionRecord';
import { sessionRecordSchema } from './sessionRecordSchema';
import { readShadow } from './sessionShadow';
import { SESSION_STORAGE_KEY } from './sessionStorageKey';

export const SessionStatus = {
  SignedIn: 'signedIn',
  SignedOut: 'signedOut',
} as const;

export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

export type SessionView =
  | { status: typeof SessionStatus.SignedIn; userId: UserIdentifier }
  | { status: typeof SessionStatus.SignedOut };

// The shadow decides first (invariants 79, 79a); storage is consulted
// only when the shadow is unset, which is always true on a fresh page
// load.
export function readSession(
  storage: KeyValueStorage,
  observability: ObservabilityFacade,
): SessionView {
  const shadow = readShadow(storage);
  if (shadow.status === 'set') {
    return { status: SessionStatus.SignedIn, userId: shadow.record.userId };
  }
  if (shadow.status === 'cleared') {
    return { status: SessionStatus.SignedOut };
  }

  const raw = storage.read(SESSION_STORAGE_KEY);
  if (raw === null) {
    return { status: SessionStatus.SignedOut };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return signedOutUnreadable(storage, observability, 'invalid_json');
  }

  const parsed = sessionRecordSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return signedOutUnreadable(storage, observability, 'invalid_shape');
  }
  if (parsed.data.version !== SESSION_SCHEMA_VERSION) {
    return signedOutUnreadable(storage, observability, 'wrong_version');
  }

  return {
    status: SessionStatus.SignedIn,
    userId: userIdentifier(parsed.data.userId),
  };
}

function signedOutUnreadable(
  storage: KeyValueStorage,
  observability: ObservabilityFacade,
  reason: 'invalid_json' | 'invalid_shape' | 'wrong_version',
): SessionView {
  observability.logger.warn('auth.session_unreadable', { reason });
  storage.remove(SESSION_STORAGE_KEY);
  return { status: SessionStatus.SignedOut };
}
