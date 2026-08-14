import { describe, expect, it } from 'vitest';
import { buildUrl } from './buildUrl';
import type { HttpRequest } from './httpRequest';

function createRequest(
  overrides: Partial<HttpRequest<unknown>> = {},
): HttpRequest<unknown> {
  return {
    method: 'GET',
    resourcePath: '/things',
    parse: (value) => value,
    ...overrides,
  };
}

describe('buildUrl', () => {
  it('resolves the resource path against the base url', () => {
    expect(buildUrl('https://api.example.com', createRequest())).toBe(
      'https://api.example.com/things',
    );
  });

  it('appends search parameters as a query string', () => {
    const url = buildUrl(
      'https://api.example.com',
      createRequest({ searchParameters: { limit: '10' } }),
    );

    expect(url).toBe('https://api.example.com/things?limit=10');
  });

  it('appends multiple search parameters', () => {
    const url = buildUrl(
      'https://api.example.com',
      createRequest({
        searchParameters: { limit: '10', cursor: 'abc' },
      }),
    );

    expect(new URL(url).searchParams.get('limit')).toBe('10');
    expect(new URL(url).searchParams.get('cursor')).toBe('abc');
  });

  it('produces no query string when searchParameters is absent', () => {
    const url = buildUrl('https://api.example.com', createRequest());

    expect(url).not.toContain('?');
  });
});
