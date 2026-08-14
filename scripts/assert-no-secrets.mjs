#!/usr/bin/env node
// Tripwire against secrets, not a proof of absence (invariants 20, 133).
// Two halves that run at different times because they scan different
// things: --source-only runs in `npm run lint` over src/, --bundle-only
// runs in `npm run verify:build` over dist/ immediately after the build
// and FAILS (not skips) when dist/ is missing.
import { execFileSync } from 'node:child_process';
import { existsSync, globSync, readFileSync } from 'node:fs';

// Every git-tracked code/config file, not a hand-maintained glob - a
// credential landing in .github/, scripts/, public/ or a root config
// file previously passed this check silently, because --source-only
// only ever scanned src/**/*.{ts,tsx}. `git ls-files` also naturally
// excludes node_modules, dist and anything else .gitignore already
// keeps out of the repository.
//
// Markdown and test files are deliberately NOT in this set: this
// repository's own specs discuss the banned keyword patterns in prose
// (TECH.md explains the apiKey/authorization/bearer bans by naming
// them) and its test fixtures deliberately contain the literal banned
// patterns as probes (guard-scripts.test.ts, eslint-configuration.test.ts).
// Scanning those would bury real findings under expected, self-referential
// noise; secret risk in docs/tests is review-carried, not this script's job.
const SCANNABLE_SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.mjs',
  '.js',
  '.json',
  '.yml',
  '.yaml',
]);
const TEST_FILE_PATTERN = /\.test\.[jt]sx?$/;

// Files that legitimately carry a long hash-like or path-like run for
// reasons unrelated to secrecy: npm's integrity hashes in the lockfile,
// the loop state file's own evidence hashes and logged file-path
// references, a workflow file's deliberate commit-SHA action pinning (a
// security best practice, not a leak), and the ESLint config's own
// `files:` glob arrays, several of which name a `src/platform/**` path
// past the 40-character threshold by construction. Excluded from the
// entropy heuristic only - SECRET_KEYWORDS still applies to all of them.
const ENTROPY_SCAN_EXCLUDES = new Set([
  'package-lock.json',
  '.github/workflows/ci.yml',
  'eslint.config.js',
  // Its own WHOLE_SCOPE_FILE_ALLOWLIST key names a src/features/auth path
  // past the 40-character threshold by construction, the same reason
  // eslint.config.js is excluded above.
  'scripts/assert-domain-vocabulary.mjs',
]);
const ENTROPY_SCAN_EXCLUDE_PATTERN = /(^|\/)loop\.json$/;

function listTrackedSourceFiles() {
  const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf-8' })
    .split('\n')
    .filter(Boolean);
  return tracked.filter((filePath) => {
    if (TEST_FILE_PATTERN.test(filePath)) return false;
    const dot = filePath.lastIndexOf('.');
    const extension = dot === -1 ? '' : filePath.slice(dot);
    return SCANNABLE_SOURCE_EXTENSIONS.has(extension);
  });
}

function listTrackedEnvFiles() {
  return execFileSync('git', ['ls-files'], { encoding: 'utf-8' })
    .split('\n')
    .filter(Boolean)
    .filter((filePath) => {
      const basename = filePath.split('/').pop() ?? '';
      return basename.startsWith('.env') && basename !== '.env.example';
    });
}

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

// This script's own pattern definitions below contain the literal
// keyword text they ban (apiKey, authorization, bearer) - excluded from
// its own keyword check for that reason, not because its content is
// exempt from scrutiny.
const KEYWORD_SCAN_EXCLUDES = new Set(['scripts/assert-no-secrets.mjs']);

function findKeywordSecrets(source, filePath, violations) {
  if (!KEYWORD_SCAN_EXCLUDES.has(filePath)) {
    for (const pattern of SECRET_KEYWORDS) {
      if (pattern.test(source)) {
        violations.push(
          `${filePath}: matches secret keyword pattern ${pattern}`,
        );
      }
    }
  }

  if (
    ENTROPY_SCAN_EXCLUDES.has(filePath) ||
    ENTROPY_SCAN_EXCLUDE_PATTERN.test(filePath)
  ) {
    return;
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
  for (const envFile of listTrackedEnvFiles()) {
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
    : listTrackedSourceFiles()) {
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
