// A structurally guaranteed lookup (the caller always masks its index to
// 0-255 against a 256-entry table) still types as possibly undefined under
// noUncheckedIndexedAccess; throwing rather than defaulting means a wrong
// index cannot silently swap in the wrong byte of a derived secret.
export function substitutionTableEntry(
  table: readonly number[],
  index: number,
): number {
  const entry = table[index];
  if (entry === undefined) {
    throw new RangeError(`substitution table has no entry at index ${index}`);
  }
  return entry;
}
