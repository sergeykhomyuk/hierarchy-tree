import { z } from 'zod';
import { USER_IDENTIFIER_PATTERN } from '../domain/userIdentifier';

// Reuses userIdentifier's own charset pattern (section 3), so a
// hand-edited or downgraded storage record carrying a hostile id is
// unreadable rather than a live identifier (invariant 77).
export const sessionRecordSchema = z.object({
  version: z.number(),
  userId: z.union([z.string().regex(USER_IDENTIFIER_PATTERN), z.int()]),
});
