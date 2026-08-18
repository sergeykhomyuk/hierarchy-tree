import { describe, expect, it, vi } from 'vitest';
import { resolveDestination } from './resolveDestination';

describe('resolveDestination', () => {
  it('derives its fallback and its login match from the shared ROUTE_PATHS map rather than an independent literal', async () => {
    vi.resetModules();
    vi.doMock('@shared/routing', () => ({
      ROUTE_PATHS: { home: '/elsewhere', login: '/signin' },
    }));

    const { resolveDestination: freshResolveDestination } =
      await import('./resolveDestination');

    // Both assertions would still pass against the OLD hardcoded '/'/'/login'
    // literals if this module ignored the mock - the real proof is that
    // BOTH move together to the mocked values, which only happens when
    // resolveDestination.ts reads ROUTE_PATHS rather than its own copies.
    expect(freshResolveDestination(null)).toBe('/elsewhere');
    expect(freshResolveDestination('/signin')).toBe('/elsewhere');

    vi.doUnmock('@shared/routing');
    vi.resetModules();
  });

  it('returns the from target when it is a same-origin path', () => {
    expect(resolveDestination('/hierarchy/users/5')).toBe('/hierarchy/users/5');
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
