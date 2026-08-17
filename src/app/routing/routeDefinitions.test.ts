import { describe, expect, it } from 'vitest';
import type { RouteObject } from 'react-router';
import { isSessionGuarded } from '@features/auth';
import { Locale } from '@platform/internationalization';
import { buildTestRuntime } from '../testing/renderRoute';
import { routeDefinitions } from './routeDefinitions';

async function buildChildren(
  developmentRoutes: boolean,
): Promise<RouteObject[]> {
  const runtime = await buildTestRuntime({ developmentRoutes });
  const [root] = routeDefinitions(runtime);
  return root?.children ?? [];
}

function topLevelPaths(children: RouteObject[]): (string | undefined)[] {
  return children.map((route) => route.path);
}

function findAuthenticated(children: RouteObject[]): RouteObject | undefined {
  return children.find((route) => route.id === 'authenticated');
}

describe('routeDefinitions', () => {
  it('registers the kit route before the wildcard when development routes are on', async () => {
    const paths = topLevelPaths(await buildChildren(true));

    expect(paths).toContain('__kit');
    expect(paths.indexOf('__kit')).toBeLessThan(paths.indexOf('*'));
  });

  it('omits the kit route entirely when the runtime flag is off', async () => {
    expect(topLevelPaths(await buildChildren(false))).not.toContain('__kit');
  });

  it('always registers the not-found wildcard last', async () => {
    const paths = topLevelPaths(await buildChildren(true));
    expect(paths[paths.length - 1]).toBe('*');
  });

  it('keep the route set at home, login and not-found', async () => {
    const children = await buildChildren(true);

    // The authenticated layout is pathless (invariant 136) - it wraps the
    // home route rather than adding a path of its own, so the route SET
    // stays exactly `/`, `login`, `__kit` and `*`.
    expect(topLevelPaths(children)).toEqual([undefined, 'login', '__kit', '*']);

    const authenticated = findAuthenticated(children);
    expect(authenticated?.path).toBeUndefined();
    expect((authenticated?.children ?? []).map((route) => route.index)).toEqual(
      [true],
    );
  });

  // Every child under the authenticated layout is registered via lazy()
  // (routeDefinitions.ts), which means its loader - if it has one - lives
  // on the object lazy() RESOLVES to, not on the static RouteObject
  // returned before react-router has ever matched the route. Reading
  // `child.loader` directly (as an earlier version of this test did)
  // always reads undefined for a lazy route regardless of what its lazy()
  // callback returns, so it could never actually catch an unguarded
  // loader added inside one - the only shape this codebase uses.
  async function resolvedLoader(child: RouteObject): Promise<unknown> {
    if ('loader' in child && child.loader !== undefined) {
      return child.loader;
    }
    if (typeof child.lazy === 'function') {
      const resolved = await child.lazy();
      return 'loader' in resolved ? resolved.loader : undefined;
    }
    return undefined;
  }

  it("wrap every guarded route's loader in withSessionGuard", async () => {
    const authenticated = findAuthenticated(await buildChildren(true));

    // Phase 2 wraps nothing - the only route beneath the authenticated
    // layout (HomeRoute) has no loader of its own yet - but this converts
    // that accident into an enforced property (invariant 146): any FUTURE
    // child loader that skips withSessionGuard fails here.
    for (const child of authenticated?.children ?? []) {
      const loader = await resolvedLoader(child);
      if (loader !== undefined) {
        expect(isSessionGuarded(loader)).toBe(true);
      }
    }
  });

  it('the hierarchy catalogue loads with the route and not with the app entry', async () => {
    const runtime = await buildTestRuntime({ developmentRoutes: true });
    // buildTestRuntime stands in for the app entry's own composition root
    // (renderRoute.tsx's own precedent) - it registers only `common`, so
    // the hierarchy namespace being absent here is what "not with the app
    // entry" means (invariant 159).
    expect(runtime.i18n.hasResourceBundle(Locale.Test, 'hierarchy')).toBe(
      false,
    );

    const [root] = routeDefinitions(runtime);
    const authenticated = findAuthenticated(root?.children ?? []);
    const indexRoute = authenticated?.children?.[0];
    if (indexRoute === undefined || typeof indexRoute.lazy !== 'function') {
      throw new Error('expected the index route to be lazy');
    }

    await indexRoute.lazy();

    expect(runtime.i18n.hasResourceBundle(Locale.Test, 'hierarchy')).toBe(true);
  });
});
