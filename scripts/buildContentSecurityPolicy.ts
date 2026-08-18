export type CspMode = 'production' | 'development';

// frame-ancestors is deliberately never emitted here: a meta-tag CSP
// ignores it and browsers warn about it (invariant 99), so it ships as
// a response header instead, from public/_headers.
export function buildContentSecurityPolicy(
  mode: CspMode,
  apiBaseUrl: string,
): string {
  const isDevelopment = mode === 'development';

  const directives = [
    "default-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "img-src 'self' data: https: http:",
    isDevelopment ? "style-src 'self' 'unsafe-inline'" : "style-src 'self'",
    "font-src 'self'",
    isDevelopment
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self'",
    isDevelopment
      ? `connect-src 'self' ${apiBaseUrl} ws:`
      : `connect-src 'self' ${apiBaseUrl}`,
  ];

  return directives.join('; ');
}
