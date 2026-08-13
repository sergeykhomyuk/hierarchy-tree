#!/usr/bin/env node
// Tripwire against secrets, not a proof of absence (invariants 20, 133).
// Two halves that run at different times because they scan different
// things: --source-only runs in `npm run lint` over src/, --bundle-only
// runs in `npm run verify:build` over dist/ immediately after the build
// and FAILS (not skips) when dist/ is missing.
import { existsSync, globSync, readdirSync, readFileSync } from 'node:fs';

const mode = process.argv.includes('--bundle-only')
  ? 'bundle'
  : process.argv.includes('--source-only')
    ? 'source'
    : null;

if (!mode) {
  console.error('assert-no-secrets: pass --source-only or --bundle-only');
  process.exit(1);
}

const HIGH_ENTROPY_HEX_OR_BASE64 =
  /\b(?:[0-9a-f]{32,}|[A-Za-z0-9+/]{40,}={0,2})\b/i;
const SECRET_KEYWORDS = [
  /apiKey/i,
  /authorization/i,
  /bearer\s/i,
  /AIza[0-9A-Za-z_-]{35}/,
];

function findKeywordSecrets(source, filePath, violations) {
  for (const pattern of SECRET_KEYWORDS) {
    if (pattern.test(source)) {
      violations.push(`${filePath}: matches secret keyword pattern ${pattern}`);
    }
  }
  const entropyMatch = source.match(HIGH_ENTROPY_HEX_OR_BASE64);
  if (entropyMatch) {
    violations.push(
      `${filePath}: high-entropy literal found (${entropyMatch[0].slice(0, 12)}...)`,
    );
  }
}

function findSuppressedRules(source, filePath, violations) {
  const bannedRulePrefixes = [
    'boundaries/',
    'no-restricted-',
    'no-explicit-any',
    'no-non-null-assertion',
  ];
  const disableLines = source
    .split('\n')
    .filter((line) => /eslint-disable/.test(line));

  for (const line of disableLines) {
    for (const prefix of bannedRulePrefixes) {
      if (line.includes(prefix)) {
        violations.push(
          `${filePath}: eslint-disable suppresses "${prefix}" - suppression is not permitted for this rule`,
        );
      }
    }
  }
}

function checkTrackedEnvFiles(violations) {
  const envFiles = readdirSync('.').filter(
    (name) => name.startsWith('.env') && name !== '.env.example',
  );
  for (const envFile of envFiles) {
    violations.push(
      `${envFile}: a .env file other than .env.example must never be tracked`,
    );
  }
}

const explicitTargets = process.argv
  .slice(2)
  .filter((arg) => !arg.startsWith('--'));
const violations = [];

if (mode === 'source') {
  if (explicitTargets.length === 0) checkTrackedEnvFiles(violations);
  for (const filePath of explicitTargets.length > 0
    ? explicitTargets
    : globSync('src/**/*.{ts,tsx}')) {
    const source = readFileSync(filePath, 'utf-8');
    findKeywordSecrets(source, filePath, violations);
    findSuppressedRules(source, filePath, violations);
  }
} else {
  if (explicitTargets.length === 0 && !existsSync('dist')) {
    console.error(
      'assert-no-secrets --bundle-only: dist/ is missing - run npm run build first',
    );
    process.exit(1);
  }
  for (const filePath of explicitTargets.length > 0
    ? explicitTargets
    : globSync('dist/**/*.{js,html,css}')) {
    const source = readFileSync(filePath, 'utf-8');
    findKeywordSecrets(source, filePath, violations);
  }
}

if (violations.length > 0) {
  console.error(`assert-no-secrets --${mode}-only: secrets found:`);
  for (const violation of violations) {
    console.error(`  - ${violation}`);
  }
  process.exit(1);
}

process.exit(0);
