#!/usr/bin/env node
// Logical properties only (invariant 67). Greps src/**/*.{tsx,css} for
// physical CSS properties and their Tailwind utility-class equivalents.
// Exit non-zero on a hit; runs as part of npm run lint.
import { readFileSync, globSync } from 'node:fs';

const PATTERNS = [
  { name: 'margin-left', regex: /\bmargin-left\b/ },
  { name: 'margin-right', regex: /\bmargin-right\b/ },
  { name: 'padding-left', regex: /\bpadding-left\b/ },
  { name: 'padding-right', regex: /\bpadding-right\b/ },
  { name: 'text-align: left|right', regex: /text-align:\s*(left|right)/ },
  { name: 'ml-*', regex: /(^|[\s"'`{])ml-\d/ },
  { name: 'mr-*', regex: /(^|[\s"'`{])mr-\d/ },
  { name: 'pl-*', regex: /(^|[\s"'`{])pl-\d/ },
  { name: 'pr-*', regex: /(^|[\s"'`{])pr-\d/ },
  { name: 'text-left', regex: /\btext-left\b/ },
  { name: 'text-right', regex: /\btext-right\b/ },
  { name: 'left-*', regex: /(^|[\s"'`{])left-\d/ },
  { name: 'right-*', regex: /(^|[\s"'`{])right-\d/ },
  { name: 'border-l', regex: /\bborder-l\b/ },
  { name: 'border-r', regex: /\bborder-r\b/ },
];

// Raw color values (invariant 71): scoped to the components and app
// shell rather than every *.css file, because shared/theme/theme.css is
// where the raw values legitimately live - it declares the tokens.
const RAW_COLOR_PATTERN = /#[0-9a-fA-F]{3,8}\b/;

const explicitTargets = process.argv
  .slice(2)
  .filter((arg) => !arg.startsWith('--'));
const physicalPropertyFiles =
  explicitTargets.length > 0 ? explicitTargets : globSync('src/**/*.{tsx,css}');
const rawColorFiles =
  explicitTargets.length > 0
    ? explicitTargets
    : [
        ...globSync('src/shared/ui/**/*.{tsx,css}'),
        ...globSync('src/app/**/*.{tsx,css}'),
      ];

const violations = [];

for (const filePath of physicalPropertyFiles) {
  const source = readFileSync(filePath, 'utf-8');
  for (const pattern of PATTERNS) {
    if (pattern.regex.test(source)) {
      violations.push(
        `${filePath}: physical property/utility "${pattern.name}" found - use the logical equivalent`,
      );
    }
  }
}

for (const filePath of rawColorFiles) {
  const source = readFileSync(filePath, 'utf-8');
  if (RAW_COLOR_PATTERN.test(source)) {
    violations.push(
      `${filePath}: raw color value found - use a theme.css token instead`,
    );
  }
}

if (violations.length > 0) {
  console.error(
    'assert-no-physical-properties: physical CSS properties found:',
  );
  for (const violation of violations) {
    console.error(`  - ${violation}`);
  }
  process.exit(1);
}

process.exit(0);
