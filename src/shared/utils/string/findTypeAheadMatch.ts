// A single character repeated ("bbb") is a cycling gesture, not a literal
// three-character prefix - collapsed back to its one character so each
// repeat searches again from the entry after the last match.
function isRepeatedSingleCharacter(buffer: string): boolean {
  return buffer.length > 1 && [...buffer].every((char) => char === buffer[0]);
}

// startsWith through Intl.Collator's base sensitivity, not
// String.startsWith - case and accent both fold away, so this matches
// exactly the string a screen reader would announce for the caller's names,
// wrapping past the end of the list back to the start.
export function findTypeAheadMatch(
  names: readonly string[],
  currentIndex: number,
  buffer: string,
  language: string,
): number | null {
  if (names.length === 0 || buffer.length === 0) return null;

  const prefix = isRepeatedSingleCharacter(buffer) ? buffer.charAt(0) : buffer;
  const collator = new Intl.Collator(language, { sensitivity: 'base' });
  const matchesPrefix = (name: string) =>
    name.length >= prefix.length &&
    collator.compare(name.slice(0, prefix.length), prefix) === 0;

  for (let offset = 1; offset <= names.length; offset += 1) {
    const index = (currentIndex + offset) % names.length;
    const name = names[index];
    if (name !== undefined && matchesPrefix(name)) return index;
  }
  return null;
}
