# G4 final-round Claude fresh-context review

Fresh-context `agentic-loop:loop-reviewer` agent, reviewing the complete final diff
`1cb72c10804e3e462795eb74cb28fc14073b9b86..HEAD` after all Codex-56..63 fixes landed.

## Findings

1. `ConfigurationErrorScreen.tsx`'s rebuild introduced a new violation of invariant 64
   (lists must be formatted via `Intl.ListFormat`, not string concatenation) by building
   the invalid-key list with `invalidKeys.join(', ')`. | ConfigurationErrorScreen.tsx:22 |
   Two or more invalid keys render with an ad hoc separator instead of a locale-correct
   conjunction, and the only prior coverage (bootstrap.test.tsx:80) used a single-element
   array so this was untested at N>1. | BLOCKING

2. The eslint meta-test claiming to prove "full bare+member+syntax coverage" for the
   `new Image().src` ban only string-inspected the selector text rather than executing
   eslint against a probe file, unlike the sibling "demonstrable negatives" tests in the
   same file. | scripts/eslint-configuration.test.ts:150-164 | A selector with a typo'd or
   subtly wrong AST shape would still have passed this test. | non-blocking

## Independent verification of the 8 Codex-56..63 fixes

All 8 confirmed correct (origin-escape, CSP validation, CI permissions, deadline-during-parse,
secret-scan widening, cancelled-request timing, discriminating deadline test). Finding 5
(ConfigurationErrorScreen) was PARTIALLY fixed - correctly uses ErrorState/catalogue but
introduced finding 1 above.

## Other areas checked, no issues found

- HTTP client retry/backoff-abort path: consistent with invariant 31.
- deployment.json, public/_headers, CI deploy job SHA-pinning, sparse-checkout: consistent.
- Layer-boundary and single-reader lint overrides: internally consistent after fetch/Image additions.
- TimingRecord/TelemetryRecord consumers: no exhaustive-switch break from the new 'cancelled' outcome.
- CSP/runtime-config validator duplication (vite.config.ts vs configurationSchema.ts): intentional, documented.

## Disposition

- Finding 1: FIXED. ConfigurationErrorScreen.tsx now formats invalidKeys through
  `new Intl.ListFormat('en')` instead of `.join(', ')`. Regression tests added in a new
  ConfigurationErrorScreen.test.tsx (multi-key Intl.ListFormat assertion, single-key no-stray-separator).
- Finding 2: FIXED. The meta-test now runs eslint against a real probe file
  (`new Image().src = '...'`) via the existing `lintOutputFor` helper, mirroring the
  "demonstrable negatives" pattern, instead of string-inspecting the selector.

Re-verified: npm run verify green, npm run e2e green (19/19).
