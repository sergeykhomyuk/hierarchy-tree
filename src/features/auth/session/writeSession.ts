import type { KeyValueStorage } from '@platform/runtime';
import type { ObservabilityFacade } from '@platform/observability';
import type { UserIdentifier } from '../domain/userIdentifier';
import { SESSION_SCHEMA_VERSION, type SessionRecord } from './sessionRecord';
import { setShadow } from './sessionShadow';
import { SESSION_STORAGE_KEY } from './sessionStorageKey';

// The shadow is set BEFORE the persist attempt, so a failed write still
// leaves the page's own session readable (invariant 79).
export function writeSession(
  storage: KeyValueStorage,
  observability: ObservabilityFacade,
  userId: UserIdentifier,
): void {
  const record: SessionRecord = { version: SESSION_SCHEMA_VERSION, userId };
  setShadow(storage, record);

  const persisted = storage.write(
    SESSION_STORAGE_KEY,
    JSON.stringify(record),
  );
  if (!persisted) {
    observability.logger.warn('auth.session_persist_failed', {});
  }
}
