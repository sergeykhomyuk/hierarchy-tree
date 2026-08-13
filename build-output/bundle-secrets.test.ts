import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('bundle secrets scan', () => {
  it('the built bundle contains no secrets', () => {
    expect(() =>
      execFileSync('node', ['scripts/assert-no-secrets.mjs', '--bundle-only'], {
        encoding: 'utf-8',
      }),
    ).not.toThrow();
  });
});
