import { redirect, replace } from 'react-router';
import { readSession } from '../session/readSession';
import type { GuardContext } from './guardContext';
import { resolveDestination } from './resolveDestination';

// The login-route guard (invariants 88-91): a signed-in visitor never
// sees the form. Returns null and lets the route render when signed out,
// which is the default path - invariant 88's "before the form renders"
// is structural, since the loader settles before the route component is
// ever constructed. Chooses replace() or redirect() by the same
// current-entry test requireSession uses, for the same reason.
export function redirectSignedInVisitor({
  request,
  tabStorage,
  observability,
}: GuardContext): null {
  const session = readSession(tabStorage, observability);
  if (session.status !== 'signedIn') {
    return null;
  }

  const url = new URL(request.url);
  const destination = resolveDestination(url.searchParams.get('from'));
  const guardedLocation = `${url.pathname}${url.search}`;
  const isCurrentEntry =
    `${window.location.pathname}${window.location.search}` ===
    guardedLocation;

  throw isCurrentEntry ? replace(destination) : redirect(destination);
}
