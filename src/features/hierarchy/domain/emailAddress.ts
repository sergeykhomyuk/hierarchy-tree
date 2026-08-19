export type EmailAddress = string & { readonly brand: unique symbol };

export function parseEmailAddress(value: unknown): EmailAddress {
  if (typeof value !== 'string') {
    throw new TypeError(`email address must be a string: ${String(value)}`);
  }
  return value as EmailAddress;
}
