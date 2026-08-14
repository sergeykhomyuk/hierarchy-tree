import { describe, expect, it } from 'vitest';
import { resolveDestination } from './resolveDestination';

describe('resolveDestination', () => {
  it('returns the from target when it is a same-origin path', () => {
    expect(resolveDestination('/hierarchy/users/5')).toBe(
      '/hierarchy/users/5',
    );
  });

  it('falls back to the hierarchy route for a protocol-relative, scheme-carrying or backslash-escaped value', () => {
    expect(resolveDestination(null)).toBe('/');
    expect(resolveDestination('//evil.example')).toBe('/');
    expect(resolveDestination('https://evil.example/x')).toBe('/');
    expect(resolveDestination('/\\evil.example/x')).toBe('/');
    expect(resolveDestination('/login')).toBe('/');
    expect(resolveDestination('not-a-path')).toBe('/');
    expect(resolveDestination('')).toBe('/');
  });

  it('keeps an unserved same-origin path rather than rewriting it', () => {
    expect(resolveDestination('/does-not-exist')).toBe('/does-not-exist');
    expect(resolveDestination('/')).toBe('/');
  });
});
