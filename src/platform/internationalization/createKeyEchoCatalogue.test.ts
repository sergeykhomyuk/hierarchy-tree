import { describe, expect, it } from 'vitest';
import { createKeyEchoCatalogue } from './createKeyEchoCatalogue';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function collectLeafPaths(
  value: unknown,
  path: readonly string[] = [],
): string[] {
  if (typeof value === 'string') {
    return [path.join('.')];
  }
  if (isRecord(value)) {
    return Object.entries(value).flatMap(([key, nested]) =>
      collectLeafPaths(nested, [...path, key]),
    );
  }
  return [];
}

function leafValueAt(catalogue: unknown, dotPath: string): unknown {
  return dotPath
    .split('.')
    .reduce<unknown>(
      (node, key) => (isRecord(node) ? node[key] : undefined),
      catalogue,
    );
}

// Shape mirrors the real catalogues (src/app/locales/en/common.json etc.) -
// multiple top-level namespaces, multiple sibling leaves per namespace,
// one two-level-deep branch - without importing them: this platform-layer
// module cannot import app/feature catalogues (boundaries/dependencies
// only allows platform -> platform (+ shared in tests)), and the generator
// is meant to be catalogue-shape-agnostic regardless. Real-catalogue
// coverage comes from the integration path (loadTranslations.ts,
// buildTestRuntime) plus the suite-wide missingKeyReports assertion.
const FIXTURE_CATALOGUE = {
  layout: {
    skipLink: 'Skip to main content',
  },
  notFound: {
    title: 'Page not found',
    linkHome: 'Back to home',
  },
  errorSurface: {
    title: 'Something went wrong',
    message: 'An unexpected error occurred.',
    retry: 'Try again',
  },
};

describe('createKeyEchoCatalogue', () => {
  it('replaces every leaf with its own dot-path key', () => {
    const echoed = createKeyEchoCatalogue(FIXTURE_CATALOGUE);
    const paths = collectLeafPaths(FIXTURE_CATALOGUE);

    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      expect(leafValueAt(echoed, path)).toBe(path);
    }
    expect(collectLeafPaths(echoed).sort()).toEqual(paths.sort());
  });

  it('never mutates the source catalogue', () => {
    const snapshot = JSON.parse(JSON.stringify(FIXTURE_CATALOGUE)) as unknown;

    createKeyEchoCatalogue(FIXTURE_CATALOGUE);

    expect(FIXTURE_CATALOGUE).toEqual(snapshot);
  });
});
