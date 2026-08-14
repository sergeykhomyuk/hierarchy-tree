import { z } from 'zod';
import { USER_IDENTIFIER_PATTERN } from '../domain/userIdentifier';

// null means no match; a charset-restricted string or a plain integer
// means a hit. Anything else - an object, an array, a boolean, an empty
// string, a fractional number - fails the parse and reaches the
// service-problem state through the client's existing parse-failure
// mapping, never the no-match state (invariants 16-18a).
export const lookupResultSchema = z.union([
  z.null(),
  z.string().regex(USER_IDENTIFIER_PATTERN),
  z.int(),
]);

export type LookupResult = z.infer<typeof lookupResultSchema>;
