import { createInstance } from 'i18next';
import { describe, expect, it } from 'vitest';
import { routeDefinitions } from './routeDefinitions';

function paths(developmentRoutes: boolean): (string | undefined)[] {
  const [root] = routeDefinitions(createInstance(), developmentRoutes);
  return (root?.children ?? []).map((route) => route.path);
}

describe('routeDefinitions', () => {
  it('registers the kit route before the wildcard when development routes are on', () => {
    const registeredPaths = paths(true);

    expect(registeredPaths).toContain('__kit');
    expect(registeredPaths.indexOf('__kit')).toBeLessThan(
      registeredPaths.indexOf('*'),
    );
  });

  it('omits the kit route entirely when the runtime flag is off', () => {
    expect(paths(false)).not.toContain('__kit');
  });

  it('always registers the not-found wildcard last', () => {
    const registeredPaths = paths(true);

    expect(registeredPaths[registeredPaths.length - 1]).toBe('*');
  });
});
