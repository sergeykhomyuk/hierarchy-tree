import { z } from 'zod';

// Zod's default object behaviour strips every field not listed here,
// password included, so it never exists on a parsed person (invariant 50).
export const personSchema = z.object({
  id: z.int().positive(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  managerId: z.int().positive().optional(),
  photo: z.string().optional(),
});

export type PersonRecord = z.infer<typeof personSchema>;
