import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type SizeLimitEntry = {
  name: string;
  path: string | string[];
  limit: string;
  gzip: boolean;
  running: boolean;
};

describe('size-limit entries', () => {
  it('size-limit entries equal the declaration table expected set', () => {
    const table = JSON.parse(
      readFileSync('build-output/expected-build-output.json', 'utf-8'),
    ) as {
      alwaysOn: { sizeLimitEntries: Array<{ name: string; limit: string }> };
    };
    const sizeLimitConfig = JSON.parse(
      readFileSync('.size-limit.json', 'utf-8'),
    ) as SizeLimitEntry[];

    // An equality over the {name, limit} projection in both directions -
    // a declared entry missing from .size-limit.json fails just as an
    // undeclared one added to .size-limit.json fails.
    const actualProjection = sizeLimitConfig.map(({ name, limit }) => ({
      name,
      limit,
    }));

    expect(actualProjection).toEqual(table.alwaysOn.sizeLimitEntries);
  });

  it('the built entry and vendor chunks match their size-limit globs', () => {
    // Runs under vitest.build-output.config.ts (npm run verify:build), which
    // is invoked immediately after npm run build - dist/ already exists by
    // the time this runs, so this checks the existing build output rather
    // than triggering a build of its own.
    const entryMatches = globSync('dist/assets/entry-*.js');
    const vendorMatches = globSync('dist/assets/vendor-*.js');

    expect(
      entryMatches.length,
      'no dist/assets/entry-*.js emitted',
    ).toBeGreaterThan(0);
    expect(
      vendorMatches.length,
      'no dist/assets/vendor-*.js emitted',
    ).toBeGreaterThan(0);
  });
});
