import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastPairs } from './contrastPairs';

const themeSource = readFileSync('src/shared/theme/theme.css', 'utf-8');

type Rgba = { r: number; g: number; b: number; a: number };

function parseTokens(block: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const match of block.matchAll(/--color-([a-z0-9-]+):\s*([^;]+);/g)) {
    const name = match[1];
    const value = match[2];
    if (name && value) tokens.set(name, value.trim());
  }
  return tokens;
}

function extractBlock(source: string, pattern: RegExp): string {
  const match = source.match(pattern);
  const block = match?.[1];
  if (block === undefined) {
    throw new Error(`theme.css block not found for pattern: ${pattern}`);
  }
  return block;
}

const THEME_BLOCK_PATTERN = /@theme\s*\{([\s\S]*?)\n\}/;
const DARK_BLOCK_PATTERN =
  /@media \(prefers-color-scheme: dark\) \{\s*:root \{([\s\S]*?)\n {2}\}/;

const lightTokens = parseTokens(extractBlock(themeSource, THEME_BLOCK_PATTERN));
const darkTokens = new Map([
  ...lightTokens,
  ...parseTokens(extractBlock(themeSource, DARK_BLOCK_PATTERN)),
]);

function resolveToken(tokens: Map<string, string>, name: string): string {
  const value = tokens.get(name);
  if (value === undefined) {
    throw new Error(`--color-${name} is not declared in this theme`);
  }
  return value;
}

function parseColor(value: string): Rgba {
  const hexMatch = value.match(/^#([0-9a-fA-F]{6})$/);
  if (hexMatch?.[1]) {
    const hex = hexMatch[1];
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgbMatch = value.match(
    /^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)\s*\)$/,
  );
  if (rgbMatch?.[1] && rgbMatch[2] && rgbMatch[3] && rgbMatch[4]) {
    return {
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3]),
      a: Number(rgbMatch[4]),
    };
  }
  throw new Error(`unrecognized color format: "${value}"`);
}

function composite(foreground: Rgba, backgroundValue: string): Rgba {
  if (foreground.a >= 1) return foreground;
  const background = parseColor(backgroundValue);
  return {
    r: foreground.r * foreground.a + background.r * (1 - foreground.a),
    g: foreground.g * foreground.a + background.g * (1 - foreground.a),
    b: foreground.b * foreground.a + background.b * (1 - foreground.a),
    a: 1,
  };
}

function relativeLuminance({ r, g, b }: Rgba): number {
  const linear = (channel: number): number => {
    const s = channel / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrastRatio(
  foregroundValue: string,
  backgroundValue: string,
): number {
  const foreground = composite(parseColor(foregroundValue), backgroundValue);
  const background = parseColor(backgroundValue);
  const lighter = Math.max(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );
  const darker = Math.min(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );
  return (lighter + 0.05) / (darker + 0.05);
}

describe('contrastPairs', () => {
  it('every contrast pair holds AA in both themes', () => {
    expect(contrastPairs.length).toBeGreaterThan(0);

    for (const pair of contrastPairs) {
      const lightRatio = contrastRatio(
        resolveToken(lightTokens, pair.foreground),
        resolveToken(lightTokens, pair.background),
      );
      expect(
        lightRatio,
        `light: ${pair.foreground} on ${pair.background} must hold ${pair.minimumRatio}:1`,
      ).toBeGreaterThanOrEqual(pair.minimumRatio);

      const darkRatio = contrastRatio(
        resolveToken(darkTokens, pair.foreground),
        resolveToken(darkTokens, pair.background),
      );
      expect(
        darkRatio,
        `dark: ${pair.foreground} on ${pair.background} must hold ${pair.minimumRatio}:1`,
      ).toBeGreaterThanOrEqual(pair.minimumRatio);
    }
  });

  it('a pair whose token is missing from a theme fails rather than being skipped', () => {
    expect(() => resolveToken(lightTokens, 'does-not-exist')).toThrow();
  });

  it('every interactive element has a focus indicator meeting 3:1', () => {
    expect(themeSource).toContain(':focus-visible');
    expect(themeSource).toContain('outline: 2px solid var(--color-focus-ring)');

    const focusPair = contrastPairs.find(
      (pair) => pair.foreground === 'focus-ring',
    );
    expect(
      focusPair,
      'contrastPairs must include a focus-ring pair',
    ).toBeDefined();
    expect(focusPair?.minimumRatio).toBeGreaterThanOrEqual(3);
  });

  it('registers the hierarchy indent rail and toggle boundary at the non-text contrast floor', () => {
    expect(contrastPairs).toEqual(
      expect.arrayContaining([
        {
          foreground: 'border-indent-rail',
          background: 'surface',
          minimumRatio: 3,
        },
        {
          foreground: 'border-control',
          background: 'surface',
          minimumRatio: 3,
        },
      ]),
    );
  });
});
