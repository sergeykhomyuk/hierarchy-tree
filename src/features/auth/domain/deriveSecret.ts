import { bytesToHex } from '@shared/utils';
import type { DerivedSecret } from './derivedSecret';
import { normalizeToCodeUnits } from './normalizeToCodeUnits';
import { substitutionTableEntry } from './substitutionTableEntry';
import { SUBSTITUTION_TABLE } from './substitutionTable';

const OUTPUT_LENGTH = 32;

// Ports the brief's `encode` over a trimmed email (invariant 9, the one
// deliberate deviation) and the password exactly as typed (invariant 10).
export function deriveSecret(email: string, password: string): DerivedSecret {
  const trimmedEmail = email.trim();
  if (trimmedEmail.length === 0 || password.length === 0) {
    throw new RangeError(
      'deriveSecret requires a non-empty email and password',
    );
  }

  const emailUnits = normalizeToCodeUnits(trimmedEmail);
  const passwordUnits = normalizeToCodeUnits(password);

  const bytes = new Uint8Array(OUTPUT_LENGTH);
  for (let position = 0; position < OUTPUT_LENGTH; position += 1) {
    // A short normalised array (invariant 7) reads past its end as
    // `undefined`; `Number(undefined)` is `NaN`, whose ToInt32 is 0, so
    // `undefined ^ x` evaluates to `x` - a missing entry lets the other
    // input alone drive that position (docs/task.md:51-52), preserved
    // rather than guarded against.
    const emailUnit = Number(emailUnits[position]);
    const passwordUnit = Number(passwordUnits[position]);
    const index = (emailUnit ^ passwordUnit) & 0xff;
    bytes[position] = substitutionTableEntry(SUBSTITUTION_TABLE, index);
  }

  return bytesToHex(bytes).toUpperCase() as DerivedSecret;
}
