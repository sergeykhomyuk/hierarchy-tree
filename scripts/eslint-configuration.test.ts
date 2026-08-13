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
});
