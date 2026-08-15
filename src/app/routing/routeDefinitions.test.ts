import { describe, expect, it } from 'vitest';
import type { RouteObject } from 'react-router';
import { isSessionGuarded } from '@features/auth';
import { buildTestRuntime } from '../testing/renderRoute';
import { routeDefinitions } from './routeDefinitions';

async function buildChildren(developmentRoutes: boolean): Promise<RouteObject[]> {
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
    expect((authenticated?.children ?? []).map((route) => route.index)).toEqual([
      true,
    ]);
  });

  it("wrap every guarded route's loader in withSessionGuard", async () => {
    const authenticated = findAuthenticated(await buildChildren(true));

    // Phase 2 wraps nothing - the only route beneath the authenticated
    // layout (HomeRoute) has no loader of its own yet - but this converts
    // that accident into an enforced property (invariant 146): any FUTURE
    // child loader that skips withSessionGuard fails here.
    for (const child of authenticated?.children ?? []) {
      if ('loader' in child && child.loader !== undefined) {
        expect(isSessionGuarded(child.loader)).toBe(true);
      }
    }
  });
});
