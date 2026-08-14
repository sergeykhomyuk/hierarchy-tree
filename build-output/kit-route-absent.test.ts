import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('kit route absence from the production bundle', () => {
  it('no dist file contains the kit route path, chunk, or state-inventory marker', () => {
    const kitRouteChunks = globSync('dist/assets/KitRoute-*.js');
    expect(kitRouteChunks, 'a KitRoute chunk reached dist').toHaveLength(0);

    const scannedFiles = globSync('dist/**/*.{js,html}');
    expect(scannedFiles.length).toBeGreaterThan(0);

    for (const filePath of scannedFiles) {
      const content = readFileSync(filePath, 'utf-8');
      expect(content, `${filePath} contains the kit route path`).not.toContain(
        '__kit',
      );
      expect(
        content,
        `${filePath} contains a kitStates state-inventory marker`,
      ).not.toContain('Kit Person');
    }
  });
});
