import { describe, expect, it } from 'vitest';
import { statusDescription } from './statusDescription';

describe('statusDescription', () => {
  it('describes 500 and above as a server error', () => {
    expect(statusDescription(500)).toBe('server error');
    expect(statusDescription(503)).toBe('server error');
  });

  it('describes 400 up to (but not including) 500 as a client error', () => {
    expect(statusDescription(400)).toBe('client error');
    expect(statusDescription(499)).toBe('client error');
  });

  it('falls back to a generic error below 400', () => {
    expect(statusDescription(399)).toBe('error');
    expect(statusDescription(0)).toBe('error');
  });
});
