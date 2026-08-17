import { describe, expect, it } from 'vitest';
import { userIdentifier } from '../domain';
import { SESSION_SCHEMA_VERSION, type SessionRecord } from './sessionRecord';

describe('the session record', () => {
  it('holds a user id and a schema version and nothing else', () => {
    const record: SessionRecord = {
      version: SESSION_SCHEMA_VERSION,
      userId: userIdentifier('user_42-A'),
    };

    expect(Object.keys(record).sort()).toEqual(['userId', 'version']);
  });
});
