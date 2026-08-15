import { z } from 'zod';
import { signedInUserSchema } from './signedInUserSchema';
import type { SignedInUserRecord } from './signedInUserSchema';

// /users.json is Firebase's own array-of-33, stored under positional
// keys (docs/task.md's `users[1]` example) - not a map keyed by the id
// the secret-lookup endpoint resolves to (ARCHITECTURE.md's decision
// log). There is no per-user path or indexed query available, so the
// whole collection is fetched once and searched. A row that fails
// signedInUserSchema is
// dropped rather than failing the whole lookup - one malformed record
// elsewhere in the collection must not hide the one this call is after
// (ARCHITECTURE.md's "tolerate bad rows").
export function parseSignedInUsers(payload: unknown): SignedInUserRecord[] {
  const rawEntries = z.array(z.unknown()).parse(payload);
  return rawEntries.flatMap((entry) => {
    const parsed = signedInUserSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}
