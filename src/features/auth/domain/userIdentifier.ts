export type UserIdentifier = (string | number) & {
  readonly brand: unique symbol;
};

// Shared by lookupResultSchema and sessionRecordSchema so the id charset
// has one source of truth. A string may reach a resource path via
// userResourcePath and a raw record via storage, and either can carry a
// traversal or a URL-structural character (invariant 18a).
const USER_IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]+$/;

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
