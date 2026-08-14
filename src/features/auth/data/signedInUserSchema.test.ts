import { describe, expect, it } from 'vitest';
import { signedInUserSchema } from './signedInUserSchema';

describe('signedInUserSchema', () => {
  it('drops the password field at the parse boundary', () => {
    const parsed = signedInUserSchema.parse({
      firstName: 'Ada',
      lastName: 'Lovelace',
      password: 'do-not-keep-me',
    });

    expect(parsed).toEqual({ firstName: 'Ada', lastName: 'Lovelace' });
    expect(Object.keys(parsed)).not.toContain('password');
  });
});
