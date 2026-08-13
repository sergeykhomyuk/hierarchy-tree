import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function runScript(
  scriptPath: string,
  args: string[] = [],
): { status: number; output: string } {
  try {
    const output = execFileSync('node', [scriptPath, ...args], {
      encoding: 'utf-8',
    });
    return { status: 0, output };
  } catch (error) {
    const execError = error as {
      status?: number;
      stdout?: string;
      stderr?: string;
    };
    return {
      status: execError.status ?? 1,
      output: `${execError.stdout ?? ''}${execError.stderr ?? ''}`,
    };
  }
}

describe('assert-domain-vocabulary', () => {
  it('the vocabulary script matches whole identifier segments and not substrings', () => {
    const probeDir = mkdtempSync(join(tmpdir(), 'domain-vocabulary-'));
    const safeFile = join(probeDir, 'safe.tmp.ts');
    const bannedFile = join(probeDir, 'banned.tmp.ts');

    // "encodeURIComponent" segments as encode/URI/Component - none of
    // which is the banned word "tree" or "report" as a whole segment.
    writeFileSync(
      safeFile,
      'export function encodeURIComponentWrapper(value: string) { return encodeURIComponent(value); }\n',
    );
    // "buildForest" is a banned whole name from invariant 129.
    writeFileSync(bannedFile, 'export function buildForest() { return []; }\n');

    const scriptPath = 'scripts/assert-domain-vocabulary.mjs';
    const safeResult = runScript(scriptPath, [safeFile]);
    const bannedResult = runScript(scriptPath, [bannedFile]);

    rmSync(probeDir, { recursive: true, force: true });

    expect(safeResult.status, 'a substring collision must not be flagged').toBe(
      0,
    );
    expect(
      bannedResult.status,
      'a whole banned identifier must be flagged',
    ).not.toBe(0);
    expect(bannedResult.output).toContain('buildForest');
  });
});

describe('assert-no-physical-properties', () => {
  it('the physical-properties script rejects a physical-direction utility', () => {
    const probeDir = mkdtempSync(join(tmpdir(), 'physical-properties-'));
    const safeFile = join(probeDir, 'Safe.tmp.tsx');
    const bannedFile = join(probeDir, 'Banned.tmp.tsx');

    writeFileSync(
      safeFile,
      'export const Safe = () => <div className="ms-4" />;\n',
    );
    writeFileSync(
      bannedFile,
      'export const Banned = () => <div className="ml-4" />;\n',
    );

    const scriptPath = 'scripts/assert-no-physical-properties.mjs';
    const safeResult = runScript(scriptPath, [safeFile]);
    const bannedResult = runScript(scriptPath, [bannedFile]);

    rmSync(probeDir, { recursive: true, force: true });

    expect(safeResult.status, 'a logical utility must not be flagged').toBe(0);
    expect(
      bannedResult.status,
      'a physical-direction utility must be flagged',
    ).not.toBe(0);
    expect(bannedResult.output).toContain('ml-');
  });
});
