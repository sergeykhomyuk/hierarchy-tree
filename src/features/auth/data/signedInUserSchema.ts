import { z } from 'zod';

// Field names per docs/task.md's own element-access example
// (users[1].firstName); the live database's exact shape is unconfirmed
// (docs/reference.md) and is verified for real by the M4 live-smoke
// suite. Zod's default object behaviour strips every field not listed
// here, including password, so it never exists as a value in application
// memory (invariant 97a).
//
// `id` is kept (unlike password) because it is the join key: /users.json
// is Firebase's own array, stored under positional keys 0..32, which is
// NOT the id the secret-lookup endpoint resolves to - that id is this
// field, confirmed against the live database (ARCHITECTURE.md's decision
// log).
// parseSignedInUsers.ts matches a resolved lookup id against this field
// across the whole collection; there is no direct per-user path to fetch.
export const signedInUserSchema = z.object({
  id: z.union([z.string(), z.int()]),
  firstName: z.string(),
  lastName: z.string(),
  photo: z.string().optional(),
});

export type SignedInUserRecord = z.infer<typeof signedInUserSchema>;
