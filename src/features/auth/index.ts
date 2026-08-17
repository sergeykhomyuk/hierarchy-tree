export { loadTranslations } from './loadTranslations';
export {
  createSignedInUserStore,
  type SignedInUserStore,
  type SignedInUserView,
} from './data';
export { LoginPage } from './LoginPage';
export type { LoginPageDependencies } from './LoginPage';
// isSessionGuarded is not part of TECH.md's stated barrel list - added
// alongside withSessionGuard (a deliberate, logged deviation, the same
// treatment resolveDestination got at step 22) because
// routeDefinitions.test.ts's structural check (invariant 146) needs to
// ask whether a given loader was produced by withSessionGuard, and
// app cannot deep-import past this feature's public entry.
export {
  resolveDestination,
  requireSession,
  redirectSignedInVisitor,
  withSessionGuard,
  isSessionGuarded,
} from './guard';
export { clearSession } from './session/clearSession';
export { readSession } from './session/readSession';
