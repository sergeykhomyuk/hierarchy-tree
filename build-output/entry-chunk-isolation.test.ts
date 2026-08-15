import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The first eight entries of the substitution table (substitutionTable.ts),
// rendered exactly as a minified bundle emits a number array literal - no
// spaces after the commas. Unique enough that a false-positive match
// elsewhere in the bundle is not a realistic concern.
const TABLE_SIGNATURE = '156,33,64,174,120,204,69,242';

function readChunk(pattern: string): string {
  const [match] = globSync(pattern);
  expect(match, `no chunk matched ${pattern}`).toBeDefined();
  return readFileSync(match as string, 'utf-8');
}

describe('entry chunk isolation', () => {
  it('the substitution table reaches LoginRoute but never the entry chunk', () => {
    // routeDefinitions.ts imports redirectSignedInVisitor eagerly (it must
    // run before the login chunk is fetched - TECH.md section 1.2), which
    // makes the whole @features/auth barrel reachable from the entry
    // chunk's module graph. package.json's sideEffects: false is what lets
    // Rolldown shake the derivation table out of it anyway; this proves
    // that holds rather than assuming it.
    const entryChunk = readChunk('dist/assets/entry-*.js');
    expect(entryChunk).not.toContain(TABLE_SIGNATURE);

    const loginChunk = readChunk('dist/assets/LoginRoute-*.js');
    expect(loginChunk).toContain(TABLE_SIGNATURE);
  });
});
