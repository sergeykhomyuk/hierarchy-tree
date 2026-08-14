# M1 boundary review - fresh-context Claude (agentic-loop:loop-reviewer)

Reviewed diff: `git diff 8b4e8f6..HEAD` (73 files, ~2820 insertions) - steps 1-14, the
domain/data/session/guard pieces below React plus the platform storage port, the redaction
path-segment rule, the runtime wiring, and the three guard narrowings.

## Review Summary

I read the full diff (3556 lines, all 73 files) and cross-checked the following against the
working tree: `src/features/auth/domain/**` (deriveSecret, normalizeToCodeUnits,
substitutionTable*, userIdentifier), `src/features/auth/data/**` (lookupUserIdentifier,
lookupResultSchema, fetchSignedInUser, createSignedInUserStore, resource-path builders,
signedInUserSchema), `src/features/auth/session/**` (sessionShadow, readSession, writeSession,
clearSession), `src/features/auth/guard/resolveDestination.ts`,
`src/platform/runtime/{keyValueStorage,createTabStorage}.ts`,
`src/platform/observability/redact.ts`, `eslint.config.js`,
`scripts/assert-domain-vocabulary.mjs`, `scripts/assert-no-secrets.mjs`, `package.json`, and the
composition-root wiring (`createRuntime.ts`, `renderRoute.tsx`, `features/auth/index.ts`). I
also read `src/platform/http/createHttpClient.ts` to confirm what values actually reach
`redact()`, and grepped for side-effect-only imports (CSS, bare imports) to sanity-check the new
`"sideEffects": false`.

I traced the deliberate Unicode/XOR defect (`normalizeToCodeUnits` -> `deriveSecret`) by hand
against the brief-equivalent reference implementations in the test files and found the port
byte-exact and the `NaN`/ToInt32 reasoning in the comments correct. The shadow-before-storage
session invariant (`writeSession`/`clearSession` set/clear the shadow before the storage call)
is implemented and tested correctly for the stated failure scenarios. `resolveDestination`'s
security backstop is the resolved-origin comparison (not the prefix heuristics), which correctly
survives WHATWG URL normalization tricks (tab-stripping, backslash-as-slash). `package.json`'s
`sideEffects: false` is safe given the only side-effect-only import in the production graph
(`@shared/theme/theme.css`) lives in the entry module `main.tsx`, which Rollup/Vite never
tree-shakes.

**Verdict: 3 findings (0 blocking)**

1. **`redact()`'s new path-segment redaction is applied to every string, not just resource
   paths, using a loose substring pattern, risking over-redaction of unrelated log strings.**
   `src/platform/observability/redact.ts:11,49-66`
   `redactValue` now runs `redactResourcePathSegment` on every string that passes through
   `redact`, not only `resourcePath` fields. `REDACTED_KEY_PATTERN`
   (`/password|secret|token/i`) is a substring match, so any future path with a segment like
   `/api/tokens/42` or `/reports/token-usage/7.json` would have the following segment scrubbed
   to `[redacted]`, even though it isn't secret data. This is safe-by-default (over-redaction,
   not under-redaction) so it isn't a security bug, but it silently changes behavior for every
   existing/future `redact()` call site beyond the one this milestone needed
   (`secretResourcePath`), which is a scope creep the milestone's own listed invariants don't
   call for.
   Non-blocking.

2. **`resolveDestination`'s login-route guard is an exact-string match, so a trailing-slash
   variant of the login path is not caught.**
   `src/features/auth/guard/resolveDestination.ts:29-31`
   `if (resolved.pathname === LOGIN_PATH)` only matches `/login` exactly. If the app's router
   also serves `/login/` (trailing slash) as the login page, `resolveDestination('/login/')`
   returns `/login/` unchanged, defeating the stated purpose ("otherwise
   `redirectSignedInVisitor` would send a signed-in visitor to a route whose own loader
   redirects again", invariant 93) for that one variant. Worst case is an extra redirect hop,
   not an open redirect, since the origin check still holds. Not covered by
   `resolveDestination.test.ts`.
   Non-blocking.

3. **`createSignedInUserStore` permanently caches a failed lookup's `null` result for the
   page's lifetime with no retry path.**
   `src/features/auth/data/createSignedInUserStore.ts:24-33`
   `fetchSignedInUser`'s promise (including a resolved `null` from any transient
   network/timeout failure) is cached in `cache` keyed by `userId` forever. A single flaky
   request means the signed-in display name can never be shown again without a full page
   reload, for the remainder of that store's lifetime. This isn't wired to any UI in this
   milestone (M4 builds the header), so it isn't observable yet, but nothing in the comments
   documents this as an accepted trade-off the way the `deriveSecret`/session invariants are -
   worth confirming intent before M4 consumes it.
   Non-blocking.

## Answers to review questions

- **Correctness (bugs, edge cases, boundaries)**: No crash-level bugs found. The `undefined ^
  x` / `NaN`->`ToInt32(0)` reasoning in `deriveSecret.ts` is correct and matches the
  hand-verified reference encoders in the tests, including the non-BMP/short-array edge case
  (`normalizeToCodeUnits.test.ts`'s 21-element astral-truncation case, hand-verified: 10 full
  "X" pairs (20 code points) + 1 lone intact surrogate pair = 21, matches).
  `substitutionTableEntry`'s throw-on-out-of-range path is unreachable in production (index is
  always masked `& 0xff` against a 256-entry table) but is directly unit-tested via a synthetic
  short table, which is honest given the stated 100%-branch-coverage constraint.
- **Contract**: Each invariant referenced in code comments (79/79a shadow-before-storage, 92
  opaque `resolveDestination`, 97a `signedInUserSchema` strips `password`, 97c the store's
  promise never rejects) is backed by a passing test that actually exercises the claimed
  behavior (e.g., `clearSession.test.ts` simulates a failed `remove` and asserts the shadow
  still reports signed-out; `writeSession.test.ts` simulates a failed `write` and asserts the
  shadow still reports signed-in).
- **Regressions**: The one cross-cutting behavior change is `redact()`'s new path-segment
  scrubbing applying globally rather than only to the new resource-path use case (finding 1) -
  safe-direction but broader than the stated need. `"sideEffects": false` was checked against
  the one CSS side-effect import in the repo (`main.tsx`, the entry module, immune to
  tree-shaking) and no other side-effect-only imports exist in the production graph, so no
  regression there.
- **Test honesty**: Tests are concrete and non-trivial (hand-worked reference encoders
  independently re-derived from the brief rather than hardcoded expected hex, real
  `fetch`-shaped transport stubs with fake clocks for retry/timeout paths, explicit
  storage-failure simulation for the session invariants). I did not find a test that would pass
  against a plausible broken implementation. N>1 coverage for `createSignedInUserStore` is
  limited to the same-userId dedup case; a second distinct userId isn't exercised, but the
  implementation is a one-line `Map` keyed lookup so the risk of an undetected bug there is low.
- **Known deferred issue already documented in the diff itself**: `loop.json`'s step-8 log entry
  already flags that `e2e/telemetry-buffer.spec.ts`'s `not.toMatch(/password|secret|token/i)`
  assertion will fail once real `/secrets/[redacted].json` paths reach the buffer (because
  `/secrets/` itself still matches `/secret/i`), and explicitly defers the fix to the M2 e2e
  boundary. Not re-reported as a new finding since it's already tracked by the diff's own audit
  trail, but flagging for visibility since it intersects with finding 1.

## Dispositions (user, 2026-08-14)

- Claude-1: accepted. Over-redaction is the safe failure mode; narrowing is speculative for
  paths that don't exist yet.
- Claude-2: accepted. Worst case is one extra redirect hop, no open-redirect risk, no
  trailing-slash login route currently exists.
- Claude-3: accepted, deferred to M4. Not consumed by any UI until the header lands; the
  retry-vs-stable-fallback tradeoff is concrete only once that consumer exists.
