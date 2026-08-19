import { globSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

// A hierarchy-only signature: the toggle analytics event name is a
// string literal inlined directly into the tree component's own toggle
// handler (unlike 'hierarchy.viewed', which the repository emits from
// its own separate chunk), survives minification, appears nowhere in the
// auth feature, and is unique enough that a false-positive match
// elsewhere in a chunk is not a realistic concern - the same technique
// entry-chunk-isolation.test.ts uses for the credential-derivation table.
const HIERARCHY_SIGNATURE = 'hierarchy.toggled';

function readChunk(pattern: string): string {
  const [match] = globSync(pattern);
  expect(match, `no chunk matched ${pattern}`).toBeDefined();
  return readFileSync(match as string, 'utf-8');
}

describe('hierarchy route isolation and budget', () => {
  it('the login route chunk imports no hierarchy module and no hierarchy catalogue', () => {
    const loginChunk = readChunk('dist/assets/LoginRoute-*.js');
    expect(loginChunk).not.toContain(HIERARCHY_SIGNATURE);

    const catalogueChunks = globSync('dist/assets/hierarchy-*.js');
    expect(
      catalogueChunks.length,
      'no hierarchy catalogue chunk emitted',
    ).toBeGreaterThan(0);

    const homeChunk = readChunk('dist/assets/HomeRoute-*.js');
    expect(
      homeChunk,
      'the isolation signature never reaches HomeRoute either, so the negative check above is vacuous',
    ).toContain(HIERARCHY_SIGNATURE);
  });

  it('the hierarchy route chunk stays inside the per-route size budget', () => {
    const [homeChunkPath] = globSync('dist/assets/HomeRoute-*.js');
    expect(homeChunkPath, 'no HomeRoute chunk emitted').toBeDefined();

    const gzippedBytes = gzipSync(readFileSync(homeChunkPath as string)).length;

    const sizeLimitConfig = JSON.parse(
      readFileSync('.size-limit.json', 'utf-8'),
    ) as Array<{ name: string; path: string; limit: string; gzip: boolean }>;
    const homeEntry = sizeLimitConfig.find(
      (entry) => entry.name === 'route: home',
    );
    expect(
      homeEntry,
      '"route: home" missing from .size-limit.json',
    ).toBeDefined();
    expect(homeEntry?.gzip).toBe(true);

    const limitKb = Number((homeEntry?.limit ?? '').replace(/\s*kB$/, ''));
    expect(
      limitKb,
      `unparseable size-limit "${homeEntry?.limit}"`,
    ).toBeGreaterThan(0);

    expect(gzippedBytes).toBeLessThanOrEqual(limitKb * 1000);
  });
});
