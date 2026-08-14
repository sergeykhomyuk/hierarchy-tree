import { z } from 'zod';

// Field names per docs/task.md's own element-access example
// (users[1].firstName); the live database's exact shape is unconfirmed
// (docs/reference.md) and is verified for real by the M4 live-smoke
// suite. Zod's default object behaviour strips every field not listed
// here, including password, so it never exists as a value in application
// memory (invariant 97a).
export const signedInUserSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
});
