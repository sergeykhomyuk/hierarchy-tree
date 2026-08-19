import { describe, expect, it } from 'vitest';
import { findTypeAheadMatch } from './findTypeAheadMatch';

const NAMES = ['Andrew Crist', 'Bar Refaeli', 'Barak Levi', 'Éric Dupont'];

describe('findTypeAheadMatch', () => {
  it('two or more distinct characters match by prefix, case-insensitively', () => {
    expect(findTypeAheadMatch(NAMES, 0, 'BAR', 'en')).toBe(1);
    expect(findTypeAheadMatch(NAMES, 0, 'bar', 'en')).toBe(1);
  });

  it('matches accent-insensitively through a locale-aware comparison', () => {
    expect(findTypeAheadMatch(NAMES, 0, 'e', 'en')).toBe(3);
  });

  it('a single repeated character cycles through every row starting with it', () => {
    expect(findTypeAheadMatch(NAMES, 0, 'b', 'en')).toBe(1);
    expect(findTypeAheadMatch(NAMES, 1, 'bb', 'en')).toBe(2);
    expect(findTypeAheadMatch(NAMES, 2, 'bbb', 'en')).toBe(1);
  });

  it('wraps to the top when no match remains after the current row', () => {
    expect(findTypeAheadMatch(NAMES, 3, 'a', 'en')).toBe(0);
  });

  it('returns null when nothing matches', () => {
    expect(findTypeAheadMatch(NAMES, 0, 'zzz', 'en')).toBeNull();
  });

  it('returns null for an empty row list', () => {
    expect(findTypeAheadMatch([], 0, 'a', 'en')).toBeNull();
  });
});
