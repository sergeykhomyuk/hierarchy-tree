import { describe, expect, it } from 'vitest';
import { SUBSTITUTION_TABLE } from './substitutionTable';
import { deriveSecret } from './deriveSecret';

// A local transcription of the brief's own `encode`, over the untrimmed
// inputs it actually receives - expectations come from evaluating the
// brief, not from hand-computed hex.
function referenceEncode(email: string, password: string): string {
  const targetLength = 32;
  const normalize = (input: string): readonly number[] => {
    let result = '';
    while (result.length < targetLength) {
      result += input;
    }
    result = result.substring(0, targetLength);
    return Array.from(result, (character) => character.charCodeAt(0));
  };
  const emailUnits = normalize(email);
  const passwordUnits = normalize(password);
  let encoded = '';
  for (let i = 0; i < targetLength; i += 1) {
    const index = (Number(emailUnits[i]) ^ Number(passwordUnits[i])) & 0xff;
    const value = SUBSTITUTION_TABLE[index] ?? 0;
    encoded += value.toString(16).padStart(2, '0').toUpperCase();
  }
  return encoded;
}

describe('deriveSecret', () => {
  it('returns 64 characters drawn only from 0-9 and A-F', () => {
    const secret = deriveSecret('person@example.com', 'correct horse battery');

    expect(secret).toMatch(/^[0-9A-F]{64}$/);
  });

  it("matches the brief's own encode, position by position, for a hand-worked input", () => {
    const email = 'person@example.com';
    const password = 'correct horse battery';

    expect(deriveSecret(email, password)).toBe(referenceEncode(email, password));
  });

  it('preserves the brief\'s high-surrogate-only defect for a non-BMP character', () => {
    const email = '😀mathematician@example.com';
    const password = 'p😀ssword';

    expect(deriveSecret(email, password)).toBe(referenceEncode(email, password));
  });

  it('drives the tail positions from the other input alone when the normalised array is short', () => {
    // '😀' repeated cycles to exactly 32 UTF-16 code units, which
    // Array.from's code-point iteration folds into 16 elements - so
    // positions 16-31 read the password array as undefined, and
    // undefined ^ x evaluates to x.
    const email = 'A'.repeat(40);
    const password = '😀';

    const secret = deriveSecret(email, password);
    const emailByte = 'A'.charCodeAt(0) & 0xff;
    const tailPairHex = (SUBSTITUTION_TABLE[emailByte] ?? 0)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();

    expect(secret.slice(32)).toBe(tailPairHex.repeat(16));
  });

  it('trims the email and therefore differs from the brief\'s encode on boundary whitespace', () => {
    const email = '  person@example.com  ';
    const password = 'correct horse battery';

    const secret = deriveSecret(email, password);

    expect(secret).not.toBe(referenceEncode(email, password));
    expect(secret).toBe(referenceEncode(email.trim(), password));
  });

  it('uses the password exactly as typed, including a single space', () => {
    const email = 'person@example.com';
    const password = ' ';

    expect(deriveSecret(email, password)).toBe(referenceEncode(email, password));
  });

  it('rejects an empty email or password instead of looping', () => {
    expect(() => deriveSecret('', 'password')).toThrow(RangeError);
    expect(() => deriveSecret('person@example.com', '')).toThrow(RangeError);
    expect(() => deriveSecret('   ', 'password')).toThrow(RangeError);
  });
});
