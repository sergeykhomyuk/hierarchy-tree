import { describe, expect, it } from 'vitest';
import type { DerivedSecret } from '../domain/derivedSecret';
import { secretResourcePath } from './secretResourcePath';

describe('secretResourcePath', () => {
  it('builds the secrets path for a derived secret', () => {
    const secret = 'AB12CD34'.repeat(8) as DerivedSecret;

    expect(secretResourcePath(secret)).toBe(`/secrets/${secret}.json`);
  });
});
