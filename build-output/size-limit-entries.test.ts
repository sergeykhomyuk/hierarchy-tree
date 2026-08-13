import { readFileSync } from 'node:fs';
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
});
