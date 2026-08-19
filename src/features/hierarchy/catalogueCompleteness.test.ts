import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('hierarchy catalogue completeness', () => {
  it('no user-visible string in the hierarchy feature is a literal', () => {
    // The repo-wide i18next/no-literal-string rule (eslint.config.js)
    // already enforces this everywhere - this test scopes that same
    // check to the hierarchy feature directory alone, so a regression
    // here fails a hierarchy-specific test rather than only a full
    // lint run (invariants 153, 154). Spawning eslint's own process is
    // slow enough to need a longer-than-default test timeout.
    expect(() =>
      execFileSync('npx', ['eslint', 'src/features/hierarchy'], {
        encoding: 'utf-8',
      }),
    ).not.toThrow();
  }, 15000);
});
