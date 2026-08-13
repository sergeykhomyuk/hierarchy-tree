import { execFileSync } from 'node:child_process';
import { globSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type TsconfigLike = {
  compilerOptions: {
    strict?: boolean;
    noUncheckedIndexedAccess?: boolean;
    exactOptionalPropertyTypes?: boolean;
    noImplicitOverride?: boolean;
    paths?: Record<string, string[]>;
  };
};

function stripJsonComments(source: string): string {
  let result = '';
  let inString = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (inString) {
      result += character;
      if (character === '\\') {
        result += next;
        index += 1;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      result += character;
      continue;
    }

    if (character === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') index += 1;
      continue;
    }

    if (character === '/' && next === '*') {
      index += 2;
      while (
        index < source.length &&
        !(source[index] === '*' && source[index + 1] === '/')
      ) {
        index += 1;
      }
      index += 1;
      continue;
    }

    result += character;
  }

  return result;
}

function parseJsonWithComments(source: string): TsconfigLike {
  return JSON.parse(stripJsonComments(source)) as TsconfigLike;
}

const ALIASES = ['@app', '@features', '@shared', '@platform'] as const;

describe('repository configuration', () => {
  it('node version is pinned consistently in .nvmrc and package.json engines', () => {
    const nvmrcVersion = readFileSync('.nvmrc', 'utf-8').trim();
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8')) as {
      engines?: { node?: string };
    };

    expect(packageJson.engines?.node).toBe(`>=${nvmrcVersion}`);
  });

  it('evidence logs under specs are not excluded by .gitignore', () => {
    const probePath =
      'specs/phase-1-setup/evidence/repository-configuration-probe.log';

    let isIgnored = true;
    try {
      execFileSync('git', ['check-ignore', '--quiet', probePath]);
    } catch (error) {
      const execError = error as { status?: number };
      if (execError.status === 1) {
        isIgnored = false;
      } else {
        throw error;
      }
    }

    expect(isIgnored).toBe(false);
  });

  it('tsconfig.app.json enables strict and the four strictness flags', () => {
    const tsconfig = parseJsonWithComments(
      readFileSync('tsconfig.app.json', 'utf-8'),
    );

    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.compilerOptions.noUncheckedIndexedAccess).toBe(true);
    expect(tsconfig.compilerOptions.exactOptionalPropertyTypes).toBe(true);
    expect(tsconfig.compilerOptions.noImplicitOverride).toBe(true);
  });

  it('path aliases resolve identically in tsconfig, Vite and Vitest', async () => {
    const tsconfig = parseJsonWithComments(
      readFileSync('tsconfig.app.json', 'utf-8'),
    );
    const tsconfigPaths = tsconfig.compilerOptions.paths ?? {};

    const viteConfig = (await import('../vite.config.ts')).default;
    const vitestConfig = (await import('../vitest.config.ts')).default;
    const viteAlias = viteConfig.resolve?.alias as
      Record<string, string> | undefined;
    const vitestAlias = vitestConfig.resolve?.alias as
      Record<string, string> | undefined;

    for (const alias of ALIASES) {
      const tsconfigTargets = tsconfigPaths[`${alias}/*`];
      const tsconfigTarget = tsconfigTargets?.[0]?.replace(/\/\*$/, '');
      expect(
        tsconfigTarget,
        `${alias} missing from tsconfig.app.json paths`,
      ).toBeDefined();

      const expected = resolve(tsconfigTarget as string);
      expect(
        viteAlias?.[alias],
        `${alias} missing from vite.config.ts alias`,
      ).toBe(expected);
      expect(
        vitestAlias?.[alias],
        `${alias} missing from vitest.config.ts alias`,
      ).toBe(expected);
    }
  });
});

describe('vitest configuration', () => {
  it('coverage thresholds are configured at 85 for lines branches and functions', async () => {
    const vitestConfig = (await import('../vitest.config.ts')).default;
    const thresholds = vitestConfig.test?.coverage?.thresholds as
      Record<string, unknown> | undefined;

    expect(thresholds?.lines).toBe(85);
    expect(thresholds?.branches).toBe(85);
    expect(thresholds?.functions).toBe(85);
  });

  it('the features domain 100 percent threshold is configured and inert while no such directory exists', async () => {
    const vitestConfig = (await import('../vitest.config.ts')).default;
    const thresholds = vitestConfig.test?.coverage?.thresholds as
      | Record<
          string,
          {
            lines: number;
            branches: number;
            functions: number;
            statements: number;
          }
        >
      | undefined;
    const domainThreshold = thresholds?.['src/features/*/domain/**'];

    expect(domainThreshold).toEqual({
      lines: 100,
      branches: 100,
      functions: 100,
      statements: 100,
    });

    const matches = globSync('src/features/*/domain');
    expect(matches, 'the domain glob should match nothing yet').toHaveLength(0);
  });

  it('every Vitest project loads the setup file that makes a real fetch throw', async () => {
    const vitestConfig = (await import('../vitest.config.ts')).default;
    const projects = vitestConfig.test?.projects ?? [];

    expect(projects.length).toBeGreaterThanOrEqual(2);
    for (const project of projects) {
      const setupFiles =
        typeof project === 'object' && project !== null && 'test' in project
          ? (project as { test?: { setupFiles?: string[] } }).test?.setupFiles
          : undefined;
      expect(setupFiles, 'project is missing setupFiles').toContain(
        './vitest.setup.ts',
      );
    }

    const originalFetch = globalThis.fetch;
    try {
      await import('../vitest.setup.ts');
      expect(() => fetch('https://example.com')).toThrow(
        'network access is not allowed in unit tests',
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('prettier configuration', () => {
  it('the Prettier config declares the tailwind stylesheet path', () => {
    const prettierConfig = JSON.parse(
      readFileSync('.prettierrc.json', 'utf-8'),
    ) as {
      tailwindStylesheet?: string;
    };

    expect(prettierConfig.tailwindStylesheet).toBe(
      './src/shared/theme/theme.css',
    );
  });
});

const M1_SIZE_LIMIT_ENTRIES = [
  {
    name: 'app entry (initial payload)',
    path: ['dist/assets/entry-*.js', 'dist/assets/vendor-*.js'],
    limit: '100 kB',
    gzip: true,
    running: false,
  },
];

describe('build output', () => {
  it('the built entry and vendor chunks match their size-limit globs', () => {
    execFileSync('npx', ['vite', 'build'], { stdio: 'pipe' });

    const entryMatches = globSync('dist/assets/entry-*.js');
    const vendorMatches = globSync('dist/assets/vendor-*.js');

    expect(
      entryMatches.length,
      'no dist/assets/entry-*.js emitted',
    ).toBeGreaterThan(0);
    expect(
      vendorMatches.length,
      'no dist/assets/vendor-*.js emitted',
    ).toBeGreaterThan(0);
  }, 30_000);

  it('size-limit entries equal the declaration table expected set', () => {
    const sizeLimitConfig = JSON.parse(
      readFileSync('.size-limit.json', 'utf-8'),
    );

    expect(sizeLimitConfig).toEqual(M1_SIZE_LIMIT_ENTRIES);
  });
});
