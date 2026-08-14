import { describe, expect, it } from 'vitest';
import { userIdentifier } from '../domain/userIdentifier';
import { userResourcePath } from './userResourcePath';

describe('userResourcePath', () => {
  it('percent-encodes the identifier into the path segment', () => {
    const id = userIdentifier('user_42-A');

    expect(userResourcePath(id)).toBe('/users/user_42-A.json');
  });
});
