import { describe, expect, it } from 'vitest';
import { parseSignedInUsers } from './parseSignedInUsers';

describe('parseSignedInUsers', () => {
  it('keeps every element that parses and drops the ones that do not', () => {
    const parsed = parseSignedInUsers([
      { id: 1, firstName: 'Ada', lastName: 'Lovelace' },
      { id: 2, firstName: 'Missing Last Name' },
      {
        id: 3,
        firstName: 'Grace',
        lastName: 'Hopper',
        password: 'do-not-keep-me',
      },
    ]);

    expect(parsed).toEqual([
      { id: 1, firstName: 'Ada', lastName: 'Lovelace' },
      { id: 3, firstName: 'Grace', lastName: 'Hopper' },
    ]);
  });

  it('throws when the payload itself is not an array', () => {
    expect(() => parseSignedInUsers({ not: 'an array' })).toThrow();
  });
});
