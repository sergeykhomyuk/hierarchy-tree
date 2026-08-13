import { describe, expect, it } from 'vitest';

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
});
