# M1 milestone review (agentic-loop:loop-reviewer, fresh context)

## Verdict: 4 findings (1 blocking)

### 1. BLOCKING — scripts/repository-configuration.test.ts runs a live `vite build` as a side effect of the default test suite

The "build output" describe block's `execFileSync('npx', ['vite', 'build'], ...)` call runs
inside the `tooling` Vitest project (`scripts/*.test.ts`), which is loaded unconditionally by
`npm run test` / `npm run test:coverage`. Every unit-test run now performs a full production
build as an uncontrolled side effect - non-hermetic, slow, and duplicates the dedicated
`build`/`verify:build` steps out of declared order. Contradicts TECH.md 7.1's explicit
build-dependent-checks-only-run-after-build design.

### 2. non-blocking — tsconfig.tools.json deviation's stated rationale (in the review-agent
briefing, not the persisted loop.json log) conflated tsconfig's `include` glob semantics
(bare segment recurses via `dirname/**/*`) with Vitest's `scripts/*.test.ts` glob semantics
(single `*` does not cross `/`). The persisted step-2 log entry itself does not make this
claim and is accurate ("scripts/live-smoke stays covered as a subset"). No code defect.

### 3. non-blocking — VERIFICATION.md overclaims `npm run verify`'s scope

VERIFICATION.md's `npm run verify` description said "the full local gate, chained... in the
same order CI runs them" while actually covering only 7 of invariant 103's 8 ordered steps
(no e2e) - a real, if minor, mismatch between the doc's wording and the shipped script.

### 4. non-blocking / observation — `alwaysOn.basePath`/`bundleSecrets` declared `true`
without a backing scan yet

`base-path.test.ts` (PLAN M5 step 31) and `bundle-secrets.test.ts` (needs M2 step 14's
assert-no-secrets.mjs) aren't written yet, so the declaration table's "unconditional" flags
are declarative ahead of their check, consistent with PLAN's own staged rollout rather than
an M1 defect.
