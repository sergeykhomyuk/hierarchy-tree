const TARGET_LENGTH = 32;

// A byte-exact transcription of the brief's normalizer (docs/task.md), down
// to iterating by code point via Array.from: an astral character that
// survives truncation collapses to one element carrying its high
// surrogate, so the result can be shorter than 32 - invariant 7.
export function normalizeToCodeUnits(input: string): readonly number[] {
  if (input.length === 0) {
    throw new RangeError(
      'normalizeToCodeUnits requires a non-empty input to avoid looping forever',
    );
  }
  let result = '';
  while (result.length < TARGET_LENGTH) {
    result += input;
  }
  result = result.substring(0, TARGET_LENGTH);
  return Array.from(result, (character) => character.charCodeAt(0));
}
