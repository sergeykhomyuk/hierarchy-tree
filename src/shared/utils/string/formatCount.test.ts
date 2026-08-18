import { describe, expect, it } from 'vitest';
import { formatCount } from './formatCount';

describe('formatCount', () => {
  it('groups digits per the passed language rather than a hardcoded one', () => {
    expect(formatCount(1234, 'en-US')).toBe('1,234');
    expect(formatCount(1234, 'de-DE')).toBe('1.234');
  });

  it('formats a value with no grouping separator unchanged', () => {
    expect(formatCount(0, 'en-US')).toBe('0');
    expect(formatCount(7, 'en-US')).toBe('7');
  });
});
