import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SUBSTITUTION_TABLE } from './substitutionTable';

function readBriefTable(): readonly number[] {
  const brief = readFileSync('docs/task.md', 'utf8');
  const match = brief.match(/const POISON_ARRAY = \[([\s\S]*?)\];/);
  const literal = match?.[1];
  if (!literal) {
    throw new Error('POISON_ARRAY literal not found in docs/task.md');
  }
  return literal
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(Number);
}

describe('the substitution table', () => {
  it('has exactly 256 entries, every one an integer in 0-255', () => {
    expect(SUBSTITUTION_TABLE).toHaveLength(256);
    for (const entry of SUBSTITUTION_TABLE) {
      expect(Number.isInteger(entry)).toBe(true);
      expect(entry).toBeGreaterThanOrEqual(0);
      expect(entry).toBeLessThanOrEqual(255);
    }
  });

  it("matches the literal extracted from the brief, entry for entry", () => {
    expect(SUBSTITUTION_TABLE).toEqual(readBriefTable());
  });
});
