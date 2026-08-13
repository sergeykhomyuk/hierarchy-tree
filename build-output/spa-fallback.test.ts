import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('spa fallback and framing header files', () => {
  it('dist/_redirects contains exactly the spa fallback rule', () => {
    const content = readFileSync('dist/_redirects', 'utf-8');

    expect(content).toBe('/* /index.html 200\n');
  });

  it('dist/_headers matches its exact expected content', () => {
    const content = readFileSync('dist/_headers', 'utf-8');

    expect(content).toBe(
      "/*\n  Content-Security-Policy: frame-ancestors 'none'\n",
    );
  });
});
