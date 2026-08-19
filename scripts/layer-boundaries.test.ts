import { globSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function importSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  const importRegex = /(?:import|export)\s[^;]*?from\s+['"]([^'"]+)['"]/g;
  let match = importRegex.exec(source);
  while (match !== null) {
    const specifier = match[1];
    if (specifier !== undefined) specifiers.push(specifier);
    match = importRegex.exec(source);
  }
  return specifiers;
}

function nonTestSourceFiles(pattern: string): string[] {
  return globSync(pattern).filter((file) => !file.includes('.test.'));
}

describe('layer boundaries', () => {
  it('the hierarchy feature imports no other feature and nothing from app', () => {
    const violations: string[] = [];
    for (const file of nonTestSourceFiles(
      'src/features/hierarchy/**/*.{ts,tsx}',
    )) {
      for (const specifier of importSpecifiers(readFileSync(file, 'utf-8'))) {
        const isApp = specifier === '@app' || specifier.startsWith('@app/');
        const isOtherFeature =
          specifier === '@features/auth' ||
          specifier.startsWith('@features/auth/');
        if (isApp || isOtherFeature) {
          violations.push(`${file} imports "${specifier}"`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('the hierarchy domain imports no React', () => {
    const violations: string[] = [];
    for (const file of nonTestSourceFiles(
      'src/features/hierarchy/domain/**/*.ts',
    )) {
      const specifiers = importSpecifiers(readFileSync(file, 'utf-8'));
      if (
        specifiers.some(
          (specifier) =>
            specifier === 'react' || specifier === 'react/jsx-runtime',
        )
      ) {
        violations.push(file);
      }
    }
    expect(violations).toEqual([]);
  });

  // A demonstrable negative (this file's own precedent: kit-route-absent
  // is asserted the same way this repository asserts a lint rule fires -
  // by probing it) - proves the two checks above actually catch a real
  // violation rather than passing vacuously because nothing was ever
  // wrong.
  it('catches a probe file that violates either rule', () => {
    const appImportProbe =
      'src/features/hierarchy/domain/__boundaryProbeApp.ts';
    const reactImportProbe =
      'src/features/hierarchy/domain/__boundaryProbeReact.ts';
    writeFileSync(
      appImportProbe,
      "import { anything } from '@app/anything';\nexport { anything };\n",
    );
    writeFileSync(
      reactImportProbe,
      "import { useState } from 'react';\nexport { useState };\n",
    );
    try {
      const appViolations: string[] = [];
      for (const file of nonTestSourceFiles(
        'src/features/hierarchy/**/*.{ts,tsx}',
      )) {
        for (const specifier of importSpecifiers(readFileSync(file, 'utf-8'))) {
          if (specifier === '@app' || specifier.startsWith('@app/')) {
            appViolations.push(`${file} imports "${specifier}"`);
          }
        }
      }
      expect(appViolations).toContain(
        `${appImportProbe} imports "@app/anything"`,
      );

      const domainReactViolations: string[] = [];
      for (const file of nonTestSourceFiles(
        'src/features/hierarchy/domain/**/*.ts',
      )) {
        const specifiers = importSpecifiers(readFileSync(file, 'utf-8'));
        if (specifiers.includes('react')) domainReactViolations.push(file);
      }
      expect(domainReactViolations).toContain(reactImportProbe);
    } finally {
      rmSync(appImportProbe);
      rmSync(reactImportProbe);
    }
  });
});
