import type { UserIdentifier } from '../domain/userIdentifier';

export const SESSION_SCHEMA_VERSION = 1;

// Two fields, nothing else (invariant 72).
export type SessionRecord = {
  version: number;
  userId: UserIdentifier;
};
