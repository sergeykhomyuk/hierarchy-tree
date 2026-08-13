import { describe, expect, it } from 'vitest';
import { deriveInitials } from './deriveInitials';

describe('deriveInitials', () => {
  it('takes the first letter of the first and last word', () => {
    expect(deriveInitials('Ada Lovelace')).toBe('AL');
  });

  it('uses a single letter for a one-word name', () => {
    expect(deriveInitials('Cher')).toBe('C');
  });

  it('collapses extra whitespace between words', () => {
    expect(deriveInitials('  Grace   Hopper  ')).toBe('GH');
  });

  it('returns an empty string for an empty name', () => {
    expect(deriveInitials('')).toBe('');
  });

  it('uppercases lowercase input', () => {
    expect(deriveInitials('ada lovelace')).toBe('AL');
  });
});
