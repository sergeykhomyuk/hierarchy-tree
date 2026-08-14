import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const themeSource = readFileSync('src/shared/theme/theme.css', 'utf-8');

describe('theme.css', () => {
  it('reduced motion disables every transition including the skeleton shimmer', () => {
    const reducedMotionIndex = themeSource.indexOf(
      '@media (prefers-reduced-motion: reduce)',
    );
    expect(
      reducedMotionIndex,
      'no prefers-reduced-motion block found',
    ).toBeGreaterThan(-1);

    const afterQuery = themeSource.slice(reducedMotionIndex);
    // A universal selector, not a per-component class, so a future
    // Skeleton shimmer animation is covered without this rule changing.
    expect(afterQuery).toContain('*::before');
    expect(afterQuery).toContain('*::after');
    expect(afterQuery).toContain('animation-duration: 0.01ms !important');
    expect(afterQuery).toContain('animation-iteration-count: 1 !important');
    expect(afterQuery).toContain('transition-duration: 0.01ms !important');
  });

  it('activates dark values from prefers-color-scheme, not a class or attribute switcher', () => {
    expect(themeSource).toContain('@media (prefers-color-scheme: dark)');
    expect(themeSource).not.toMatch(/\.dark\b/);
    expect(themeSource).not.toMatch(/data-theme/);
  });

  it('declares every dark override over a token name already declared in @theme', () => {
    const themeBlockMatch = themeSource.match(/@theme\s*\{([\s\S]*?)\n\}/);
    const darkBlockMatch = themeSource.match(
      /@media \(prefers-color-scheme: dark\) \{\s*:root \{([\s\S]*?)\n {2}\}/,
    );
    expect(themeBlockMatch).not.toBeNull();
    expect(darkBlockMatch).not.toBeNull();

    const tokenName = (declaration: string): string | null =>
      declaration.match(/(--[a-z0-9-]+):/)?.[1] ?? null;

    const lightTokens = new Set(
      (themeBlockMatch?.[1] ?? '')
        .split('\n')
        .map(tokenName)
        .filter((name): name is string => name !== null),
    );
    const darkTokens = (darkBlockMatch?.[1] ?? '')
      .split('\n')
      .map(tokenName)
      .filter((name): name is string => name !== null);

    for (const token of darkTokens) {
      expect(lightTokens.has(token), `${token} has no light declaration`).toBe(
        true,
      );
    }
    expect(darkTokens.length).toBeGreaterThan(0);
  });
});
