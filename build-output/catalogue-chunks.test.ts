import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type ManifestChunk = {
  file: string;
  src?: string;
  dynamicImports?: string[];
};
type Manifest = Record<string, ManifestChunk>;

function readManifest(): Manifest {
  return JSON.parse(
    readFileSync('dist/.vite/manifest.json', 'utf-8'),
  ) as Manifest;
}

describe('catalogue chunks', () => {
  it('each route chunk imports only its own catalogue chunk', () => {
    const manifest = readManifest();
    const loginRoute = manifest['src/app/routing/routes/LoginRoute.tsx'];
    const homeRoute = manifest['src/app/routing/routes/HomeRoute.tsx'];

    expect(
      loginRoute,
      'LoginRoute missing from the build manifest',
    ).toBeDefined();
    expect(
      homeRoute,
      'HomeRoute missing from the build manifest',
    ).toBeDefined();

    expect(loginRoute?.dynamicImports).toEqual([
      'src/features/auth/locales/en/auth.json',
    ]);
    expect(homeRoute?.dynamicImports).toEqual([
      'src/features/hierarchy/locales/en/hierarchy.json',
    ]);
  });

  it('emits a chunk file for each catalogue', () => {
    for (const catalogueName of ['auth', 'hierarchy']) {
      const matches = globSync(`dist/assets/${catalogueName}-*.js`);
      expect(
        matches.length,
        `no dist/assets/${catalogueName}-*.js emitted`,
      ).toBeGreaterThan(0);
    }
  });
});
