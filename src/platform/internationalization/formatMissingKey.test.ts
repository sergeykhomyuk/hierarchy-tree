import { describe, expect, it } from 'vitest';
import { formatMissingKey } from './formatMissingKey';

describe('formatMissingKey', () => {
  it('renders the visible marker around the missing key', () => {
    expect(formatMissingKey('login.submit')).toBe('⟦login.submit⟧');
  });
});
