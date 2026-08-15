export type UserIdentifier = (string | number) & {
  readonly brand: unique symbol;
};

// Shared by lookupResultSchema and sessionRecordSchema so the id charset
// has one source of truth. A string reaches storage (the session record)
// and is compared against the users collection's own id field
// (fetchSignedInUser.ts) - no id is interpolated into a URL path since
// ARCHITECTURE.md's 2026-08-15 decision log entry (there is no per-id
// path against the real database), but a stored value or a comparison
// key can still carry a traversal or a URL-structural character worth
// rejecting at the boundary (invariant 18a).
export const USER_IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]+$/;

export function userIdentifier(value: string | number): UserIdentifier {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new RangeError(
        `user identifier must be a finite integer: ${value}`,
      );
    }
    return value as UserIdentifier;
  }
  if (!USER_IDENTIFIER_PATTERN.test(value)) {
    throw new RangeError(
      `user identifier contains a disallowed character: ${value}`,
    );
  }
  return value as UserIdentifier;
}
