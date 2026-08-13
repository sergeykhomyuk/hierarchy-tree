import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function lintOutputFor(probePath: string, source: string): string {
  writeFileSync(probePath, source);
  try {
    execFileSync('npx', ['eslint', probePath], { encoding: 'utf-8' });
    return '';
  } catch (error) {
    return String((error as { stdout?: string }).stdout ?? '');
  } finally {
    rmSync(probePath);
  }
}

type RuleValue = string | [string, ...unknown[]];
type ConfigEntry = { rules?: Record<string, RuleValue>; files?: string[] };

function ruleSeverity(value: RuleValue): string {
  return Array.isArray(value) ? String(value[0]) : String(value);
}

async function readEslintConfig(): Promise<ConfigEntry[]> {
  const eslintConfigPath = '../eslint.config.js';
  return (await import(eslintConfigPath)).default as ConfigEntry[];
}

function collectRules(
  config: ConfigEntry[],
  prefix: string,
): Array<{ name: string; value: RuleValue; files: string[] | undefined }> {
  return config.flatMap((entry) =>
    Object.entries(entry.rules ?? {})
      .filter(([name]) => name.startsWith(prefix))
      .map(([name, value]) => ({ name, value, files: entry.files })),
  );
}

describe('eslint configuration', () => {
  it('the boundaries rules are configured at error severity', async () => {
    const config = await readEslintConfig();
    const boundaryRules = collectRules(config, 'boundaries/');

    expect(boundaryRules.length).toBeGreaterThan(0);
    for (const rule of boundaryRules) {
      expect(ruleSeverity(rule.value), `${rule.name} must be "error"`).toBe(
        'error',
      );
    }
  });

  it('the storage ban covers all five globals in bare and member forms', async () => {
    const config = await readEslintConfig();
    const storageGlobals = [
      'localStorage',
      'sessionStorage',
      'indexedDB',
      'caches',
    ];
    const storageProperties = [...storageGlobals, 'serviceWorker'];

    const restrictedGlobals = collectRules(
      config,
      'no-restricted-globals',
    ).flatMap(
      (rule) =>
        (Array.isArray(rule.value) ? rule.value.slice(1) : []) as unknown[],
    ) as Array<{ name?: string } | string>;
    const bannedGlobalNames = restrictedGlobals.map((entry) =>
      typeof entry === 'string' ? entry : entry.name,
    );

    for (const name of storageGlobals) {
      expect(
        bannedGlobalNames,
        `${name} missing from no-restricted-globals`,
      ).toContain(name);
    }

    const restrictedProperties = collectRules(
      config,
      'no-restricted-properties',
    ).flatMap(
      (rule) =>
        (Array.isArray(rule.value) ? rule.value.slice(1) : []) as unknown[],
    ) as Array<{ property?: string }>;
    const bannedPropertyNames = new Set(
      restrictedProperties.map((entry) => entry.property),
    );

    for (const name of storageProperties) {
      expect(
        bannedPropertyNames.has(name),
        `${name} missing from no-restricted-properties`,
      ).toBe(true);
    }
  });

  it('the restricted-syntax rules are configured at error severity', async () => {
    const config = await readEslintConfig();
    // Single-reader files (createSystemClock.ts and friends) legitimately
    // turn the rule 'off' in their own narrow override block - only the
    // broad, repo-wide declaration is asserted here.
    const broadRules = collectRules(config, 'no-restricted-syntax').filter(
      (rule) => rule.files?.some((glob) => glob.includes('*')),
    );

    expect(broadRules.length).toBeGreaterThan(0);
    for (const rule of broadRules) {
      expect(ruleSeverity(rule.value), `${rule.name} must be "error"`).toBe(
        'error',
      );
    }
  });

  it('the testing-harness override is scoped to test files and no wider', async () => {
    const config = await readEslintConfig();
    const boundaryRules = collectRules(config, 'boundaries/dependencies');

    expect(boundaryRules.length).toBe(2);
    const [baseRule, overrideRule] = boundaryRules;

    expect(baseRule?.files).toEqual(['src/**/*.{ts,tsx}']);
    expect(
      overrideRule?.files,
      'override files glob must be exactly the test-file pattern',
    ).toEqual(['src/**/*.test.{ts,tsx}']);
    expect(ruleSeverity(overrideRule!.value)).toBe('error');

    const basePolicies = (
      baseRule!.value as [string, { policies: unknown[] }]
    )[1].policies;
    const overridePolicies = (
      overrideRule!.value as [string, { policies: unknown[] }]
    )[1].policies;

    expect(overridePolicies.length, 'only feature and shared rows change').toBe(
      basePolicies.length,
    );

    const basePoliciesJson = basePolicies.map((policy) =>
      JSON.stringify(policy),
    );
    const overridePoliciesJson = overridePolicies.map((policy) =>
      JSON.stringify(policy),
    );
    const changedRows = overridePoliciesJson.filter(
      (policy, index) => policy !== basePoliciesJson[index],
    );

    expect(changedRows.length, 'exactly feature and shared should differ').toBe(
      2,
    );
    for (const changed of changedRows) {
      expect(changed).toContain('testing-harness');
    }
  });
});

describe('demonstrable negatives', () => {
  it('lint fails with the boundaries rule named on a cross-feature import', () => {
    const output = lintOutputFor(
      'src/features/auth/boundariesCrossFeatureProbe.ts',
      "import { HierarchyPlaceholderPage } from '@features/hierarchy';\nexport { HierarchyPlaceholderPage as _probe };\n",
    );

    expect(output).toContain('boundaries/dependencies');
    expect(output).toContain('feature');
  });

  it('lint fails with the restricted-import rule named on a deep feature import', () => {
    const output = lintOutputFor(
      'src/app/restrictedImportProbe.ts',
      "import { HierarchyPlaceholderPage } from '@features/hierarchy/HierarchyPlaceholderPage';\nexport { HierarchyPlaceholderPage as _probe };\n",
    );

    expect(output).toContain('no-restricted-imports');
    expect(output).toContain('public entry');
  });
});
