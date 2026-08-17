import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy } from './buildContentSecurityPolicy';

const API_BASE_URL = 'https://example.test';

describe('buildContentSecurityPolicy', () => {
  it.each(['production', 'development'] as const)(
    'the %s policy carries the required directive list',
    (mode) => {
      const policy = buildContentSecurityPolicy(mode, API_BASE_URL);

      expect(policy).toContain("default-src 'self'");
      expect(policy).toContain("object-src 'none'");
      expect(policy).toContain("base-uri 'self'");
      expect(policy).toContain("img-src 'self' data:");
      expect(policy).toMatch(new RegExp(`connect-src[^;]*${API_BASE_URL}`));
    },
  );

  it.each(['production', 'development'] as const)(
    'the %s policy never carries frame-ancestors',
    (mode) => {
      const policy = buildContentSecurityPolicy(mode, API_BASE_URL);

      expect(policy).not.toContain('frame-ancestors');
    },
  );

  it('the development policy allows unsafe-inline and unsafe-eval for HMR and React Refresh', () => {
    const policy = buildContentSecurityPolicy('development', API_BASE_URL);

    expect(policy).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
    expect(policy).toContain("style-src 'self' 'unsafe-inline'");
    expect(policy).toContain('ws:');
  });

  it.each(['production', 'development'] as const)(
    'the content security policy permits https image origins and changes no other directive',
    (mode) => {
      const policy = buildContentSecurityPolicy(mode, API_BASE_URL);
      const directives = policy.split('; ');

      // The exact img-src segment - not merely toContain(), which would
      // still pass if https: had never actually been added.
      expect(directives).toContain("img-src 'self' data: https:");

      // Pinning the full directive set (content and count) is what proves
      // nothing ELSE changed - a future edit to any of these shows up as a
      // failing assertion here, not a silent pass.
      expect(directives).toContain("default-src 'self'");
      expect(directives).toContain("object-src 'none'");
      expect(directives).toContain("base-uri 'self'");
      expect(directives).toContain("font-src 'self'");
      if (mode === 'development') {
        expect(directives).toContain("style-src 'self' 'unsafe-inline'");
        expect(directives).toContain(
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        );
        expect(directives).toContain(`connect-src 'self' ${API_BASE_URL} ws:`);
      } else {
        expect(directives).toContain("style-src 'self'");
        expect(directives).toContain("script-src 'self'");
        expect(directives).toContain(`connect-src 'self' ${API_BASE_URL}`);
      }
      expect(directives).toHaveLength(8);
    },
  );

  it('the production policy allows neither unsafe-inline, unsafe-eval, nor ws:', () => {
    const policy = buildContentSecurityPolicy('production', API_BASE_URL);

    expect(policy).not.toContain('unsafe-inline');
    expect(policy).not.toContain('unsafe-eval');
    expect(policy).not.toContain('ws:');
    expect(policy).toContain("script-src 'self'");
    expect(policy).toContain("style-src 'self'");
  });
});
