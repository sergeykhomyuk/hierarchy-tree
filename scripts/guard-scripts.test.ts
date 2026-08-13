import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function runScript(
  scriptPath: string,
  args: string[] = [],
  options: { cwd?: string } = {},
): { status: number; output: string } {
  try {
    const output = execFileSync('node', [scriptPath, ...args], {
      encoding: 'utf-8',
      cwd: options.cwd,
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

  it('checks the public name of an aliased export, not its local name', () => {
    const probeDir = mkdtempSync(join(tmpdir(), 'domain-vocabulary-alias-'));
    // Under the exported-scope check (invariant 8's word list), so the
    // banned "session" word must be caught only via the correct name.
    const bannedFile = join(probeDir, 'src', 'shared', 'banned-alias.tmp.ts');
    mkdirSync(join(probeDir, 'src', 'shared'), { recursive: true });

    // The local declaration is innocuous; only the PUBLIC (post-`as`) name
    // carries the banned word "session" - a buggy local-name extraction
    // would miss this entirely.
    writeFileSync(
      bannedFile,
      'function safeHelper() { return null; }\nexport { safeHelper as sessionToken };\n',
    );

    const result = runScript('scripts/assert-domain-vocabulary.mjs', [
      bannedFile,
    ]);

    rmSync(probeDir, { recursive: true, force: true });

    expect(
      result.status,
      'the public exported name must be checked, not the local name',
    ).not.toBe(0);
    expect(result.output).toContain('sessionToken');
  });

  it('checks a default-exported function/class name', () => {
    const probeDir = mkdtempSync(join(tmpdir(), 'domain-vocabulary-default-'));
    const bannedFile = join(probeDir, 'src', 'shared', 'banned-default.tmp.ts');
    mkdirSync(join(probeDir, 'src', 'shared'), { recursive: true });

    writeFileSync(
      bannedFile,
      'export default function sessionManager() { return null; }\n',
    );

    const result = runScript('scripts/assert-domain-vocabulary.mjs', [
      bannedFile,
    ]);

    rmSync(probeDir, { recursive: true, force: true });

    expect(result.status, 'a banned default export must be flagged').not.toBe(
      0,
    );
    expect(result.output).toContain('sessionManager');
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

  it('no component references a raw color value instead of a token', () => {
    const probeDir = mkdtempSync(join(tmpdir(), 'raw-color-'));
    const safeFile = join(probeDir, 'Safe.tmp.tsx');
    const bannedFile = join(probeDir, 'Banned.tmp.tsx');

    writeFileSync(
      safeFile,
      'export const Safe = () => <div className="bg-surface text-ink" />;\n',
    );
    writeFileSync(
      bannedFile,
      'export const Banned = () => <div style={{}} className="text-[#1b1230]" />;\n',
    );

    const scriptPath = 'scripts/assert-no-physical-properties.mjs';
    const safeResult = runScript(scriptPath, [safeFile]);
    const bannedResult = runScript(scriptPath, [bannedFile]);

    rmSync(probeDir, { recursive: true, force: true });

    expect(safeResult.status, 'a token utility must not be flagged').toBe(0);
    expect(bannedResult.status, 'a raw hex color must be flagged').not.toBe(0);
    expect(bannedResult.output).toContain('raw color');
  });
});

describe('assert-no-lorem-ipsum', () => {
  it('rejects filler text and leaves real copy alone', () => {
    const probeDir = mkdtempSync(join(tmpdir(), 'lorem-ipsum-'));
    const safeFile = join(probeDir, 'Safe.tmp.tsx');
    const bannedFile = join(probeDir, 'Banned.tmp.tsx');

    writeFileSync(
      safeFile,
      'export const Safe = () => <p>This screen is a placeholder.</p>;\n',
    );
    writeFileSync(
      bannedFile,
      'export const Banned = () => <p>Lorem ipsum dolor sit amet.</p>;\n',
    );

    const scriptPath = 'scripts/assert-no-lorem-ipsum.mjs';
    const safeResult = runScript(scriptPath, [safeFile]);
    const bannedResult = runScript(scriptPath, [bannedFile]);

    rmSync(probeDir, { recursive: true, force: true });

    expect(safeResult.status, 'real copy must not be flagged').toBe(0);
    expect(
      bannedResult.status,
      'lorem ipsum filler text must be flagged',
    ).not.toBe(0);
    expect(bannedResult.output).toContain('lorem ipsum');
  });
});

describe('assert-no-secrets', () => {
  const scriptPath = 'scripts/assert-no-secrets.mjs';

  it('requires --source-only or --bundle-only', () => {
    const result = runScript(scriptPath, []);

    expect(result.status).not.toBe(0);
    expect(result.output).toContain('--source-only or --bundle-only');
  });

  it('flags a secret keyword pattern and leaves a clean file alone', () => {
    const probeDir = mkdtempSync(join(tmpdir(), 'no-secrets-keyword-'));
    const safeFile = join(probeDir, 'safe.tmp.ts');
    const bannedFile = join(probeDir, 'banned.tmp.ts');

    writeFileSync(safeFile, 'export const label = "public label";\n');
    writeFileSync(
      bannedFile,
      'export const config = { apiKey: "whatever" };\n',
    );

    const safeResult = runScript(scriptPath, ['--source-only', safeFile]);
    const bannedResult = runScript(scriptPath, ['--source-only', bannedFile]);

    rmSync(probeDir, { recursive: true, force: true });

    expect(safeResult.status, 'a clean file must not be flagged').toBe(0);
    expect(bannedResult.status, 'an apiKey literal must be flagged').not.toBe(
      0,
    );
    expect(bannedResult.output).toContain('apiKey');
  });

  it('flags a high-entropy literal', () => {
    const probeDir = mkdtempSync(join(tmpdir(), 'no-secrets-entropy-'));
    const bannedFile = join(probeDir, 'banned.tmp.ts');

    writeFileSync(
      bannedFile,
      'export const token = "9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e";\n',
    );

    const result = runScript(scriptPath, ['--source-only', bannedFile]);

    rmSync(probeDir, { recursive: true, force: true });

    expect(
      result.status,
      'a high-entropy hex literal must be flagged',
    ).not.toBe(0);
    expect(result.output).toContain('high-entropy');
  });

  it('flags an eslint-disable suppressing a banned rule', () => {
    const probeDir = mkdtempSync(join(tmpdir(), 'no-secrets-suppression-'));
    const bannedFile = join(probeDir, 'banned.tmp.ts');

    writeFileSync(
      bannedFile,
      '// eslint-disable-next-line no-restricted-globals\nconst probe = fetch;\nexport { probe };\n',
    );

    const result = runScript(scriptPath, ['--source-only', bannedFile]);

    rmSync(probeDir, { recursive: true, force: true });

    expect(result.status, 'a suppressed banned rule must be flagged').not.toBe(
      0,
    );
    expect(result.output).toContain('no-restricted-');
  });

  it('--bundle-only fails rather than skips when dist/ is missing', () => {
    const probeDir = mkdtempSync(join(tmpdir(), 'no-secrets-bundle-'));
    const result = runScript(
      join(process.cwd(), scriptPath),
      ['--bundle-only'],
      {
        cwd: probeDir,
      },
    );

    rmSync(probeDir, { recursive: true, force: true });

    expect(result.status, 'a missing dist/ must fail, not skip').not.toBe(0);
    expect(result.output).toContain('dist/ is missing');
  });
});
