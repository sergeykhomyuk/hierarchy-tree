import { describe, expect, it } from 'vitest';
import { SUBSTITUTION_TABLE } from './substitutionTable';
import { substitutionTableChecksum } from './substitutionTableChecksum';

const RECORDED_CHECKSUM = 0x05311407;

describe('substitutionTableChecksum', () => {
  it("matches the recorded FNV-1a constant for the brief's table", () => {
    expect(substitutionTableChecksum(SUBSTITUTION_TABLE)).toBe(
      RECORDED_CHECKSUM,
    );
  });
});
