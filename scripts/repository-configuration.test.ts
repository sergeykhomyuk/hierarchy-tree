import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('repository configuration', () => {
  it('node version is pinned consistently in .nvmrc and package.json engines', () => {
    const nvmrcVersion = readFileSync('.nvmrc', 'utf-8').trim();
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8')) as {
      engines?: { node?: string };
    };

    expect(packageJson.engines?.node).toBe(`>=${nvmrcVersion}`);
  });

  it('evidence logs under specs are not excluded by .gitignore', () => {
    const probePath = 'specs/phase-1-setup/evidence/repository-configuration-probe.log';

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
});
