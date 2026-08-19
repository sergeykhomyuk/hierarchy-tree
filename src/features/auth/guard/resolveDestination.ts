import { ROUTE_PATHS } from '@shared/routing';

const PLACEHOLDER_ORIGIN = 'https://resolve-destination.invalid';

// Pure and opaque (invariant 92): a candidate is never inspected for
// content beyond the shape checks that keep it from becoming an open
// redirect. The origin check is not belt-and-braces - the WHATWG parser
// resolves a backslash-escaped path to a DIFFERENT origin
// (createHttpClient.ts:53-62's finding), which no prefix heuristic alone
// catches (invariant 68).
export function resolveDestination(from: string | null): string {
  if (from === null || from.length === 0 || from[0] !== '/') {
    return ROUTE_PATHS.home;
  }
  if (from.length >= 2 && (from[1] === '/' || from[1] === '\\')) {
    return ROUTE_PATHS.home;
  }

  let resolved: URL;
  try {
    resolved = new URL(from, PLACEHOLDER_ORIGIN);
  } catch {
    return ROUTE_PATHS.home;
  }
  if (resolved.origin !== PLACEHOLDER_ORIGIN) {
    return ROUTE_PATHS.home;
  }

  // Otherwise redirectSignedInVisitor would send a signed-in visitor to a
  // route whose own loader redirects again (invariant 93).
  if (resolved.pathname === ROUTE_PATHS.login) {
    return ROUTE_PATHS.home;
  }

  return from;
}
