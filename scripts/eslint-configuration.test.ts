import { execFileSync } from 'node:child_process';
import { globSync, rmSync, writeFileSync } from 'node:fs';
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

  it('permits sessionStorage only in createTabStorage', async () => {
    const config = await readEslintConfig();
    const globalsRules = collectRules(config, 'no-restricted-globals');

    const tabStorageRule = globalsRules.find((rule) =>
      (rule.files ?? []).includes('src/platform/runtime/createTabStorage.ts'),
    );
    expect(
      tabStorageRule,
      'createTabStorage.ts must have its own no-restricted-globals override',
    ).toBeDefined();

    const tabStorageNames = (
      Array.isArray(tabStorageRule?.value) ? tabStorageRule.value.slice(1) : []
    ).map((entry) =>
      typeof entry === 'string' ? entry : (entry as { name?: string }).name,
    );
    expect(tabStorageNames).not.toContain('sessionStorage');

    // Every other no-restricted-globals entry (the blanket
    // src/**/*.{ts,tsx} block) still bans it.
    const otherRulesBanningSessionStorage = globalsRules.filter((rule) => {
      if (rule === tabStorageRule) return false;
      const names = (Array.isArray(rule.value) ? rule.value.slice(1) : []).map(
        (entry) =>
          typeof entry === 'string' ? entry : (entry as { name?: string }).name,
      );
      return names.includes('sessionStorage');
    });
    expect(otherRulesBanningSessionStorage.length).toBeGreaterThan(0);
  });

  it('the network ban covers every enumerated identifier in bare and member forms', async () => {
    const config = await readEslintConfig();
    const bareNetworkGlobals = [
      'fetch',
      'XMLHttpRequest',
      'WebSocket',
      'EventSource',
    ];
    // `fetch` and `sendBeacon` are also reachable through a member
    // expression (window.fetch, globalThis.fetch, navigator.sendBeacon);
    // the invariant names all three explicitly, not the bare identifier
    // alone.
    const memberNetworkProperties = ['fetch', 'sendBeacon'];

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

    for (const name of bareNetworkGlobals) {
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

    for (const name of memberNetworkProperties) {
      expect(
        bannedPropertyNames.has(name),
        `${name} missing from no-restricted-properties`,
      ).toBe(true);
    }

    const output = lintOutputFor(
      'src/app/imageSrcProbe.ts',
      "new Image().src = 'https://example.test/x.png';\nexport {};\n",
    );
    expect(
      output,
      'no-restricted-syntax must fire and name the http-client message on new Image().src',
    ).toContain('no-restricted-syntax');
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

    expect(
      overridePolicies.length,
      'only feature, shared and platform rows change',
    ).toBe(basePolicies.length);

    const basePoliciesJson = basePolicies.map((policy) =>
      JSON.stringify(policy),
    );
    const overridePoliciesJson = overridePolicies.map((policy) =>
      JSON.stringify(policy),
    );
    const changedRows = overridePoliciesJson.filter(
      (policy, index) => policy !== basePoliciesJson[index],
    );

    // feature and shared additionally reach testing-harness (the real
    // provider stack a feature/kit test needs - invariant 90); platform
    // additionally reaches shared, because the http client's own tests
    // depend on the fakes TECH.md 3.2/6.1 place in shared/testing, and
    // shared cannot move into platform without becoming domain-aware.
    expect(
      changedRows.length,
      'exactly feature, shared and platform should differ',
    ).toBe(3);
    const testingHarnessRows = changedRows.filter((changed) =>
      changed.includes('testing-harness'),
    );
    const platformSharedRows = changedRows.filter(
      (changed) =>
        changed.includes('"type":"platform"') && changed.includes('shared'),
    );
    expect(testingHarnessRows.length).toBe(2);
    expect(platformSharedRows.length).toBe(1);
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

  it('lint fails with the restricted-import rule named on a redirect import', () => {
    const output = lintOutputFor(
      'src/app/redirectProbe.ts',
      "import { redirect } from 'react-router';\nexport const _probe = redirect;\n",
    );

    expect(output).toContain('no-restricted-imports');
    expect(output).toContain('src/features/auth/guard');
  });

  it('a redirect import is permitted inside src/features/auth/guard but redirectDocument is not', () => {
    const permittedOutput = lintOutputFor(
      'src/features/auth/guard/redirectPermittedProbe.ts',
      "import { redirect } from 'react-router';\nexport const _probe = redirect;\n",
    );
    expect(permittedOutput).not.toContain('no-restricted-imports');

    const bannedOutput = lintOutputFor(
      'src/features/auth/guard/redirectDocumentBannedProbe.ts',
      "import { redirectDocument } from 'react-router';\nexport const _probe = redirectDocument;\n",
    );
    expect(bannedOutput).toContain('no-restricted-imports');
    expect(bannedOutput).toContain('full document load');
  });

  it('the feature layer may not import useRevalidator', () => {
    const output = lintOutputFor(
      'src/features/hierarchy/useRevalidatorProbe.ts',
      "import { useRevalidator } from 'react-router';\nexport const _probe = useRevalidator;\n",
    );

    expect(output).toContain('no-restricted-imports');
    expect(output).toContain('src/app/');
  });
});

describe('the redirect sinks-ban narrowing', () => {
  it('the sinks pattern is present in all three no-restricted-imports blocks', async () => {
    const config = await readEslintConfig();
    const restrictedImportRows = config.filter(
      (entry) => entry.rules?.['no-restricted-imports'] !== undefined,
    );

    const redirectRows = restrictedImportRows.filter((entry) => {
      const value = entry.rules?.['no-restricted-imports'];
      const options = Array.isArray(value) ? value[1] : undefined;
      const paths = (
        options as { paths?: Array<{ name?: string }> } | undefined
      )?.paths;
      return paths?.some((path) => path.name === 'react-router');
    });

    expect(redirectRows.length).toBe(3);
    for (const row of redirectRows) {
      const value = row.rules?.['no-restricted-imports'];
      const options = Array.isArray(value) ? value[1] : undefined;
      const patterns = (
        options as { patterns?: Array<{ message?: string }> } | undefined
      )?.patterns;
      expect(
        patterns?.some((pattern) => pattern.message?.includes('createSink.ts')),
        `block for ${JSON.stringify(row.files)} is missing the sinks pattern`,
      ).toBe(true);
    }
  });
});

describe('kit literal-string guard', () => {
  it('no kit component contains a user-visible literal', () => {
    const files = globSync('src/shared/ui/**/*.tsx').filter(
      (file) => !file.endsWith('.test.tsx'),
    );
    expect(
      files.length,
      'expected the eight kit components to exist',
    ).toBeGreaterThan(0);

    let output = '';
    try {
      execFileSync('npx', ['eslint', ...files], { encoding: 'utf-8' });
    } catch (error) {
      output = String((error as { stdout?: string }).stdout ?? '');
    }

    expect(output).not.toContain('i18next/no-literal-string');
  });
});
