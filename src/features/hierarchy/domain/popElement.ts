// A caller-guaranteed non-empty array (checked via `array.length > 0` in the
// while condition just before this runs) still types `.pop()` as possibly
// undefined under noUncheckedIndexedAccess; throwing rather than defaulting
// means a broken guarantee cannot silently drop a stack entry.
export function popElement<Value>(array: Value[]): Value {
  const element = array.pop();
  if (element === undefined) {
    throw new RangeError('cannot pop from an empty array');
  }
  return element;
}
