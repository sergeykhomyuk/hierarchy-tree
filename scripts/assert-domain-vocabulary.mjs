#!/usr/bin/env node
// Tripwire against accidental reintroduction of banned vocabulary - a grep,
// not a proof of absence (invariants 8, 127, 128, 129, 130). Matches at
// identifier-SEGMENT level, not by substring: splitting on camelCase/
// PascalCase/snake_case/digit boundaries means "encode" never matches a
// banned "code" segment, and "reportMissingKey" matches banned "report"
// only as its own first segment - which is why legitimate collisions need
// an explicit allow-list rather than a rename.
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';

const EXPORTED_SCOPE_GLOBS = [
  'src/shared/**/*.{ts,tsx}',
  'src/platform/**/*.{ts,tsx}',
];
const EXPORTED_SCOPE_BANNED_WORDS = [
  'user',
  'manager',
  'report',
  'hierarchy',
  'tree',
  'session',
  'login',
  'credential',
  'secret',
];

const WHOLE_SCOPE_GLOB = 'src/**/*.{ts,tsx}';
const WHOLE_SCOPE_BANNED_NAMES = [
  'make32',
  'POISON_ARRAY',
  'buildForest',
  'flattenVisible',
];

const ALLOWED_IDENTIFIERS = new Set([
  'encodeURIComponent',
  'URLSearchParams',
  'reportMissingKey',
  'reportRootError',
  'reportWebVitals',
]);

// redact.ts's key list names the words it redacts - that's a redaction
// rule, not a domain concept, and is allow-listed by file.
const FILE_ALLOWLIST = {
  'src/platform/observability/redact.ts': new Set(['secret']),
};

function segmentIdentifier(identifier) {
  return identifier
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-zA-Z])([0-9])/g, '$1_$2')
    .replace(/([0-9])([a-zA-Z])/g, '$1_$2')
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((segment) => segment.toLowerCase());
}

function containsContiguousSubsequence(haystack, needle) {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  for (let start = 0; start <= haystack.length - needle.length; start += 1) {
    let matches = true;
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[start + offset] !== needle[offset]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}

function extractIdentifiers(source) {
  const matches = source.matchAll(/\b[A-Za-z_$][A-Za-z0-9_$]*\b/g);
  return [...matches].map((match) => match[0]);
}

function extractExportedIdentifiers(source) {
  const names = new Set();
  for (const match of source.matchAll(
    /export\s+default\s+(?:function\*?|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g,
  )) {
    names.add(match[1]);
  }
  for (const match of source.matchAll(
    /export\s+(?:const|let|var|function\*?|class|type|interface|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g,
  )) {
    names.add(match[1]);
  }
  for (const match of source.matchAll(/export\s*{([^}]+)}/g)) {
    for (const rawName of match[1].split(',')) {
      // The PUBLIC name is what matters here - for "local as Public" that
      // is the part after `as`, not the local declaration being renamed.
      const parts = rawName.trim().split(/\s+as\s+/);
      const name = (parts.length > 1 ? parts[1] : parts[0])?.trim();
      if (name) names.add(name);
    }
  }
  return [...names];
}

const explicitTargets = process.argv
  .slice(2)
  .filter((arg) => !arg.startsWith('--'));

function targetFiles(defaultGlobs) {
  return explicitTargets.length > 0 ? explicitTargets : globSync(defaultGlobs);
}

function checkExportedVocabulary() {
  const violations = [];
  for (const filePath of targetFiles(EXPORTED_SCOPE_GLOBS).filter(
    (path) => !path.endsWith('.test.ts') && !path.endsWith('.test.tsx'),
  )) {
    const source = readFileSync(filePath, 'utf-8');
    const fileAllowlist = FILE_ALLOWLIST[filePath] ?? new Set();

    for (const identifier of extractExportedIdentifiers(source)) {
      if (ALLOWED_IDENTIFIERS.has(identifier)) continue;
      const segments = segmentIdentifier(identifier);

      for (const bannedWord of EXPORTED_SCOPE_BANNED_WORDS) {
        if (fileAllowlist.has(bannedWord)) continue;
        if (containsContiguousSubsequence(segments, [bannedWord])) {
          violations.push(
            `${filePath}: exported identifier "${identifier}" carries the banned domain word "${bannedWord}"`,
          );
        }
      }
    }
  }
  return violations;
}

function checkWholeScopeVocabulary() {
  const violations = [];
  for (const filePath of targetFiles(WHOLE_SCOPE_GLOB).filter(
    (path) => !path.endsWith('.test.ts') && !path.endsWith('.test.tsx'),
  )) {
    const source = readFileSync(filePath, 'utf-8');

    for (const identifier of extractIdentifiers(source)) {
      if (ALLOWED_IDENTIFIERS.has(identifier)) continue;
      const segments = segmentIdentifier(identifier);

      for (const bannedName of WHOLE_SCOPE_BANNED_NAMES) {
        const bannedSegments = segmentIdentifier(bannedName);
        if (containsContiguousSubsequence(segments, bannedSegments)) {
          violations.push(
            `${filePath}: identifier "${identifier}" carries banned reference-system name "${bannedName}"`,
          );
        }
      }
    }

    if (source.includes('/secrets')) {
      violations.push(`${filePath}: string literal contains "/secrets"`);
    }

    if (/role\s*=\s*["']tree["']/.test(source)) {
      violations.push(`${filePath}: role="tree" attribute found`);
    }
  }
  return violations;
}

const violations = [
  ...checkExportedVocabulary(),
  ...checkWholeScopeVocabulary(),
];

if (violations.length > 0) {
  console.error('assert-domain-vocabulary: banned vocabulary found:');
  for (const violation of violations) {
    console.error(`  - ${violation}`);
  }
  process.exit(1);
}

process.exit(0);
