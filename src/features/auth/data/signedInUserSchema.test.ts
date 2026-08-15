import { describe, expect, it } from 'vitest';
import { signedInUserSchema } from './signedInUserSchema';

describe('signedInUserSchema', () => {
  it('drops the password field at the parse boundary', () => {
    const parsed = signedInUserSchema.parse({
      id: 2217873750,
      firstName: 'Ada',
      lastName: 'Lovelace',
      password: 'do-not-keep-me',
    });

    expect(parsed).toEqual({
      id: 2217873750,
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
    expect(Object.keys(parsed)).not.toContain('password');
  });

  it('accepts a string id as well as a numeric one', () => {
    const parsed = signedInUserSchema.parse({
      id: 'user_1',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });

    expect(parsed.id).toBe('user_1');
  });
});
