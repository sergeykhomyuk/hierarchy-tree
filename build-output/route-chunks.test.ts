import { globSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ROUTE_NAMES = ['HomeRoute', 'LoginRoute', 'NotFoundRoute'];

describe('route chunks', () => {
  it('emits a chunk file for each route', () => {
    for (const routeName of ROUTE_NAMES) {
      const matches = globSync(`dist/assets/${routeName}-*.js`);
      expect(
        matches.length,
        `no dist/assets/${routeName}-*.js emitted`,
      ).toBeGreaterThan(0);
    }
  });
});
