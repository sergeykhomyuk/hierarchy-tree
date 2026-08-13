import { execFileSync } from 'node:child_process';
import { existsSync, globSync, readFileSync } from 'node:fs';
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

    const viteConfigFn = (await import('../vite.config.ts')).default;
    const viteConfig = await (typeof viteConfigFn === 'function'
      ? viteConfigFn({ command: 'build', mode: 'production' })
      : viteConfigFn);
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

  it('the live smoke test file is collected by no default vitest project', async () => {
    const vitestConfig = (await import('../vitest.config.ts')).default;
    const projects = vitestConfig.test?.projects ?? [];
    const liveSmokeFile = 'scripts/live-smoke/live-smoke.test.ts';

    expect(existsSync(liveSmokeFile)).toBe(true);

    for (const project of projects) {
      const include =
        typeof project === 'object' && project !== null && 'test' in project
          ? ((project as { test?: { include?: string[] } }).test?.include ?? [])
          : [];

      for (const pattern of include) {
        // A glob's `*` does not cross a `/`, so `scripts/*.test.ts`
        // matches nothing under `scripts/live-smoke/` - asserted here
        // rather than trusted, since the pattern that keeps this
        // suite out is a single character away from one that would not.
        const matches = globSync(pattern);
        expect(
          matches,
          `project pattern "${pattern}" unexpectedly collects the live smoke file`,
        ).not.toContain(liveSmokeFile);
      }
    }

    const liveConfig = (await import('../vitest.live.config.ts')).default;
    const liveInclude = liveConfig.test?.include ?? [];
    const liveMatches = liveInclude.flatMap((pattern) => globSync(pattern));
    expect(liveMatches).toContain(liveSmokeFile);
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

describe('template cruft removal', () => {
  it('the Vite template files no longer exist', () => {
    const removedPaths = [
      'src/App.tsx',
      'src/App.css',
      'src/index.css',
      'src/main.tsx',
      'src/assets/react.svg',
      'src/assets/vite.svg',
      'src/assets/hero.png',
      'public/icons.svg',
    ];

    for (const removedPath of removedPaths) {
      expect(
        existsSync(removedPath),
        `${removedPath} should have been deleted`,
      ).toBe(false);
    }
  });
});

const GATING_SCRIPTS_IN_WORKFLOW_ORDER = [
  'typecheck',
  'lint',
  'format:check',
  'test:coverage',
  'build',
  'verify:build',
  'size',
  'e2e',
];

describe('npm scripts', () => {
  it('every gating npm script named by the workflow order exists in package.json', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8')) as {
      scripts?: Record<string, string>;
    };

    for (const scriptName of GATING_SCRIPTS_IN_WORKFLOW_ORDER) {
      expect(
        packageJson.scripts?.[scriptName],
        `npm script "${scriptName}" is missing`,
      ).toBeDefined();
    }
  });
});

// Invariant 134: exactly this set, so a new runtime dependency is a
// deliberate edit here rather than a drift a `dependencies` bump slips
// past unnoticed.
const RUNTIME_DEPENDENCY_ALLOW_LIST = [
  'i18next',
  'react',
  'react-dom',
  'react-i18next',
  'react-router',
  'web-vitals',
  'zod',
].sort();

describe('runtime dependencies', () => {
  it('package.json dependencies match the allow-list exactly', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8')) as {
      dependencies?: Record<string, string>;
    };
    const actual = Object.keys(packageJson.dependencies ?? {}).sort();

    expect(actual).toEqual(RUNTIME_DEPENDENCY_ALLOW_LIST);
  });
});
