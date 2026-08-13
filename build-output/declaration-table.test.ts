import { existsSync, globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type DeclarationTable = {
  phase: 'building' | 'complete';
  alwaysOn: {
    basePath: boolean;
    bundleSecrets: boolean;
    sizeLimitEntries: Array<{ name: string; limit: string }>;
  };
  routeChunks?: Record<string, unknown>;
  catalogueChunks?: Record<string, unknown>;
  spaFallback?: Record<string, unknown>;
  kitRouteAbsent?: Record<string, unknown>;
};

const CONDITIONAL_FAMILIES = [
  'routeChunks',
  'catalogueChunks',
  'spaFallback',
  'kitRouteAbsent',
] as const;

function readDeclarationTable(): DeclarationTable {
  return JSON.parse(
    readFileSync('build-output/expected-build-output.json', 'utf-8'),
  ) as DeclarationTable;
}

describe('declaration table', () => {
  it('the declaration table is internally valid at phase building', () => {
    const table = readDeclarationTable();

    expect(['building', 'complete']).toContain(table.phase);
    expect(table.alwaysOn.basePath).toBe(true);
    expect(table.alwaysOn.bundleSecrets).toBe(true);
    expect(Array.isArray(table.alwaysOn.sizeLimitEntries)).toBe(true);
    expect(table.alwaysOn.sizeLimitEntries.length).toBeGreaterThan(0);

    // Fail-closed: when complete, every conditional family must be present
    // and non-empty - an absent key only asserts nothing while its artifact
    // genuinely does not exist yet.
    if (table.phase === 'complete') {
      for (const family of CONDITIONAL_FAMILIES) {
        expect(
          table[family],
          `${family} must be present at phase complete`,
        ).toBeDefined();
        expect(
          Object.keys(table[family] ?? {}).length,
          `${family} must be non-empty at phase complete`,
        ).toBeGreaterThan(0);
      }
    }

    // The flip is derived from dist, not taken on trust: a build that
    // already emits route chunks while phase is still 'building' silently
    // arms nothing, so this fails loudly instead.
    const routeChunksInDist = existsSync('dist')
      ? globSync('dist/assets/*Route-*.js')
      : [];

    if (routeChunksInDist.length > 0) {
      expect(
        table.phase,
        'dist contains route chunks but phase is still building - flip build-output/expected-build-output.json to complete',
      ).toBe('complete');
    }
  });

  it('the declaration table is complete and every family is declared at phase complete', () => {
    const table = readDeclarationTable();

    expect(table.phase).toBe('complete');
    for (const family of CONDITIONAL_FAMILIES) {
      expect(table[family], `${family} must be present`).toBeDefined();
      expect(
        Object.keys(table[family] ?? {}).length,
        `${family} must be non-empty`,
      ).toBeGreaterThan(0);
    }
  });
});
