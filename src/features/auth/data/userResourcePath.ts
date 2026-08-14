import type { ResourcePath } from '@platform/http';
import type { UserIdentifier } from '../domain/userIdentifier';

// Percent-encoding is belt and braces: userIdentifier's charset already
// guarantees a safe path segment, but this keeps the guarantee from
// depending on the check having run on every path into this function.
export function userResourcePath(userId: UserIdentifier): ResourcePath {
  return `/users/${encodeURIComponent(String(userId))}.json`;
}
