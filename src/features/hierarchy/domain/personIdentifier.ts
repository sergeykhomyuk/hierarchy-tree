export type PersonIdentifier = number & { readonly brand: unique symbol };

export function parsePersonIdentifier(value: unknown): PersonIdentifier {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(
      `person id must be a safe positive integer: ${String(value)}`,
    );
  }
  return value as PersonIdentifier;
}
