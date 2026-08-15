import { redirect, replace } from 'react-router';
import { readSession } from '../session/readSession';
import type { UserIdentifier } from '../domain/userIdentifier';
import type { GuardContext } from './guardContext';

const LOGIN_PATH = '/login';

// The authenticated-route guard (invariants 84-87). Signed out, it throws
// a redirect to the login route carrying `from` - replace() when the
// guarded URL is already the current history entry (a direct load, a
// reload, a POP), redirect() when it is the target of an in-app push, so
// Back always returns to where the visitor actually came from rather
// than re-entering the guard or leaving the app.
export function requireSession({
  request,
  tabStorage,
  observability,
}: GuardContext): { userId: UserIdentifier } {
  const session = readSession(tabStorage, observability);
  if (session.status === 'signedIn') {
    return { userId: session.userId };
  }

  const url = new URL(request.url);
  const guardedLocation = `${url.pathname}${url.search}`;
  const destination = `${LOGIN_PATH}?from=${encodeURIComponent(guardedLocation)}`;
  const isCurrentEntry =
    `${window.location.pathname}${window.location.search}` ===
    guardedLocation;

  throw isCurrentEntry ? replace(destination) : redirect(destination);
}
