import { describe, expect, it } from 'vitest';
import { normalizeToCodeUnits } from './normalizeToCodeUnits';

// A local transcription of the brief's own `make32`, so expectations come
// from independently evaluating the brief rather than being hand-computed.
function referenceNormalize(input: string): readonly number[] {
  const targetLength = 32;
  let result = '';
  while (result.length < targetLength) {
    result += input;
  }
  result = result.substring(0, targetLength);
  return Array.from(result, (character) => character.charCodeAt(0));
}

describe('normalizeToCodeUnits', () => {
  it('cycles a short input to exactly 32 code units', () => {
    const units = normalizeToCodeUnits('ab');

    expect(units).toEqual(referenceNormalize('ab'));
    expect(units).toHaveLength(32);
  });

  it('keeps only the first 32 code units of a long input', () => {
    const input = 'x'.repeat(50);
    const units = normalizeToCodeUnits(input);

    expect(units).toEqual(referenceNormalize(input));
    expect(units).toHaveLength(32);
  });

  it('returns fewer than 32 entries when an astral character survives truncation', () => {
    // Each "😀x" block is 3 UTF-16 code units (high surrogate, low
    // surrogate, "x"); 11 blocks is 33 units, one more than the 32-unit
    // cap, so truncation drops only the final block's trailing "x" and
    // every surrogate pair stays intact - Array.from's code-point
    // iteration then folds each intact pair into a single element.
    const input = '😀x'.repeat(11);
    const units = normalizeToCodeUnits(input);

    expect(units).toEqual(referenceNormalize(input));
    expect(units).toHaveLength(21);
    expect(units.length).toBeLessThan(32);
  });

  it('throws a RangeError for an empty string instead of looping forever', () => {
    expect(() => normalizeToCodeUnits('')).toThrow(RangeError);
  });
});
