#!/usr/bin/env node
// The mechanical half of invariants 96/96a/132: the placeholder pages
// promise nothing and carry no mockup chrome. A lorem ipsum filler string
// is the one part of "carries no inert control or lorem ipsum" a grep can
// actually catch; the rest is review-dependent. Exit non-zero on a hit;
// runs as part of npm run lint.
import { readFileSync, globSync } from 'node:fs';

const LOREM_PATTERN = /lorem\s+ipsum/i;

const explicitTargets = process.argv
  .slice(2)
  .filter((arg) => !arg.startsWith('--'));
const targetFiles =
  explicitTargets.length > 0
    ? explicitTargets
    : globSync('src/**/*.{ts,tsx,json}');

const violations = [];

for (const filePath of targetFiles) {
  const source = readFileSync(filePath, 'utf-8');
  if (LOREM_PATTERN.test(source)) {
    violations.push(`${filePath}: lorem ipsum filler text found`);
  }
}

if (violations.length > 0) {
  console.error('assert-no-lorem-ipsum: filler text found:');
  for (const violation of violations) {
    console.error(`  - ${violation}`);
  }
  process.exit(1);
}

process.exit(0);
