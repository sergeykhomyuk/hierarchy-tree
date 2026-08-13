# M2 milestone review (agentic-loop:loop-reviewer, fresh context)

## Verdict: 6 findings (3 blocking)

### 1. BLOCKING - missing lint override for createObservability.ts
TECH.md section 2.3 requires a file-scoped no-restricted-imports override for
src/platform/observability/createObservability.ts (the one file allowed to
import sink modules). No such override exists. Once M3 creates this file,
lint would block its own required sink imports.

### 2. BLOCKING - features' no-restricted-imports: 'off' also disables the sinks ban
The src/features/*/** override set the WHOLE rule to 'off', not just the two
deep-feature-import groups TECH.md specifies ("turns the first two groups
off"). This silently disables the sinks-path ban (invariant 45) for all
feature code too.

### 3. BLOCKING - extractExportedIdentifiers bug in assert-domain-vocabulary.mjs
`export { localName as PublicName }` extracted "localName" (pre-`as`) instead
of "PublicName" (the actual public export invariant 8 must check). Also
`export default function/class Name` was never matched at all.

### 4. non-blocking - interface/type member (prop) names not checked
A real structural gap of the regex-based approach vs a full AST parse;
acknowledged residual limitation, not fixed this milestone.

### 5. non-blocking - single-reader overrides disable whole rule families
createFetchTransport.ts/createSystemClock.ts/createSystemRandomness.ts
overrides turned off entire rule arrays instead of just the specific
identifier each file needs, weakening lint's ability to catch misuse
even within the "chosen" module (e.g. a raw setTimeout inside
createFetchTransport.ts would go undetected).

### 6. non-blocking - assert-no-secrets.mjs has zero test coverage
Wired into npm run lint with no automated test of its keyword/entropy/
suppression-grep/env-file logic or its --source-only/--bundle-only modes.
