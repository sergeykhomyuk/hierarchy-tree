export { loadTranslations } from './loadTranslations';
export {
  createSignedInUserStore,
  type SignedInUserStore,
  type SignedInUserView,
} from './data';
export { LoginPage } from './LoginPage';
export type { LoginPageDependencies } from './LoginPage';
export { resolveDestination } from './guard/resolveDestination';
export { requireSession } from './guard/requireSession';
export { redirectSignedInVisitor } from './guard/redirectSignedInVisitor';
// isSessionGuarded is not part of TECH.md's stated barrel list - added
// alongside withSessionGuard (a deliberate, logged deviation, the same
// treatment resolveDestination got at step 22) because
// routeDefinitions.test.ts's structural check (invariant 146) needs to
// ask whether a given loader was produced by withSessionGuard, and
// app cannot deep-import past this feature's public entry.
export { withSessionGuard, isSessionGuarded } from './guard/withSessionGuard';
export { clearSession } from './session/clearSession';
export { readSession } from './session/readSession';
