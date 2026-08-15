import { requireSession } from './requireSession';
import type { GuardContext } from './guardContext';

type Loader = (args: { request: Request }) => unknown;

const guardedLoaders = new WeakSet<Loader>();

// Wraps a child loader so the session guard runs as its FIRST statement
// (invariant 85): react-router runs every matched route's loaders in
// parallel and short-circuits on the first redirect, so a guard on a
// parent route alone does not stop a child's loader from having already
// started. Phase 2 wraps no route - the guarded route (HomeRoute) has no
// loader yet - but the structural test that checks every route beneath
// the authenticated layout is either loader-less or produced by this
// converts that accident into an enforced property, so phase 3 cannot
// add a bare loader there unnoticed (invariant 146's named exception).
export function withSessionGuard<Args extends { request: Request }, R>(
  context: Pick<GuardContext, 'tabStorage' | 'observability'>,
  loader: (args: Args) => R,
): (args: Args) => R {
  function guarded(args: Args): R {
    requireSession({ request: args.request, ...context });
    return loader(args);
  }
  guardedLoaders.add(guarded as Loader);
  return guarded;
}

export function isSessionGuarded(loader: unknown): boolean {
  return typeof loader === 'function' && guardedLoaders.has(loader as Loader);
}
