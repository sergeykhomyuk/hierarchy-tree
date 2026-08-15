import type { KeyValueStorage } from '@platform/runtime';
import type { ObservabilityFacade } from '@platform/observability';
import { userIdentifier, type UserIdentifier } from '../domain/userIdentifier';
import { SESSION_SCHEMA_VERSION } from './sessionRecord';
import { sessionRecordSchema } from './sessionRecordSchema';
import { readShadow } from './sessionShadow';
import { SESSION_STORAGE_KEY } from './sessionStorageKey';

export type SessionView =
  { status: 'signedIn'; userId: UserIdentifier } | { status: 'signedOut' };

// The shadow decides first (invariants 79, 79a); storage is consulted
// only when the shadow is unset, which is always true on a fresh page
// load.
export function readSession(
  storage: KeyValueStorage,
  observability: ObservabilityFacade,
): SessionView {
  const shadow = readShadow(storage);
  if (shadow.status === 'set') {
    return { status: 'signedIn', userId: shadow.record.userId };
  }
  if (shadow.status === 'cleared') {
    return { status: 'signedOut' };
  }

  const raw = storage.read(SESSION_STORAGE_KEY);
  if (raw === null) {
    return { status: 'signedOut' };
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

  return { status: 'signedIn', userId: userIdentifier(parsed.data.userId) };
}

function signedOutUnreadable(
  storage: KeyValueStorage,
  observability: ObservabilityFacade,
  reason: 'invalid_json' | 'invalid_shape' | 'wrong_version',
): SessionView {
  observability.logger.warn('auth.session_unreadable', { reason });
  storage.remove(SESSION_STORAGE_KEY);
  return { status: 'signedOut' };
}
