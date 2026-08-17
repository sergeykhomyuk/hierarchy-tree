import { describe, expect, it } from 'vitest';
import type { ShouldRevalidateFunctionArgs } from 'react-router';
import { shouldRevalidateExpansionOnly } from './shouldRevalidateExpansionOnly';

function args(
  overrides: Partial<ShouldRevalidateFunctionArgs>,
): ShouldRevalidateFunctionArgs {
  return {
    currentUrl: new URL('https://example.test/'),
    currentParams: {},
    nextUrl: new URL('https://example.test/'),
    nextParams: {},
    defaultShouldRevalidate: true,
    ...overrides,
  };
}

describe('shouldRevalidateExpansionOnly', () => {
  it('an expanded-only difference suppresses revalidation on both routes', () => {
    const result = shouldRevalidateExpansionOnly(
      args({
        currentUrl: new URL('https://example.test/?expanded=1'),
        nextUrl: new URL('https://example.test/?expanded=1,2'),
      }),
    );

    expect(result).toBe(false);
  });

  it('an identical-URL revalidation returns defaultShouldRevalidate rather than false', () => {
    const url = new URL('https://example.test/?expanded=1');

    const result = shouldRevalidateExpansionOnly(
      args({ currentUrl: url, nextUrl: url, defaultShouldRevalidate: true }),
    );

    expect(result).toBe(true);
  });

  it('a difference in any other search parameter falls back to defaultShouldRevalidate', () => {
    const result = shouldRevalidateExpansionOnly(
      args({
        currentUrl: new URL('https://example.test/?expanded=1&other=a'),
        nextUrl: new URL('https://example.test/?expanded=1&other=b'),
        defaultShouldRevalidate: true,
      }),
    );

    expect(result).toBe(true);
  });

  it("detects a difference confined to a repeated search parameter's later occurrence", () => {
    const result = shouldRevalidateExpansionOnly(
      args({
        currentUrl: new URL('https://example.test/?other=a&other=b'),
        nextUrl: new URL('https://example.test/?other=a&other=c'),
        defaultShouldRevalidate: true,
      }),
    );

    expect(result).toBe(true);
  });
});
