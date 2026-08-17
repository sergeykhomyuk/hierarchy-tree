// A structurally guaranteed lookup (the caller only ever indexes within the
// bounds it just built) still types as possibly undefined under
// noUncheckedIndexedAccess; throwing rather than defaulting means a wrong
// index cannot silently substitute the wrong element.
export function elementAt<Value>(
  array: readonly Value[],
  index: number,
): Value {
  const element = array[index];
  if (element === undefined) {
    throw new RangeError(`no element at index ${index}`);
  }
  return element;
}
