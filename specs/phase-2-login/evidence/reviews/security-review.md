# Dedicated security review (agentic-loop:loop-reviewer, security-focused pass)

Scope: the whole phase-2-login diff at HEAD (equivalent coverage to `git diff 6511fb1..HEAD` - the reviewer read the auth feature slice, the platform HTTP/observability layers, the app-layer routing/guard/header wiring, the eslint guard-narrowing config, and the relevant unit/e2e suites directly). This is a dedicated security pass, separate from the general-correctness milestone reviews and the final G4 dual review - required because `loop.json` sets `security_review: true`.

## Verdict

**PASS - no exploitable security issue found. 0 findings, 0 blocking.**

This phase's security posture matches what PRODUCT.md and ARCHITECTURE.md claim.

## Findings

None.

## Answers to the six review questions

**1. Credential handling.** No password/email/derived secret reaches a log, URL, telemetry, or persistent storage beyond the one URL invariant 132 permits (`/secrets/<secret>.json`). Traced every call site in `useLoginSubmission.ts`, `deriveSecret.ts`, `writeSession.ts`, and every telemetry event payload. `e2e/login.spec.ts`'s credential-leak test (now covering 6 surfaces via `assertNoCredentialLeak`, both whole-value and twelve-character-window) is a real, executable assertion.

**2. Session integrity.** Cannot be forged/tampered to authenticate as a different user within the app's own stated threat model (client-side lookup is explicitly not real authentication - invariant 133). `sessionRecordSchema.ts` and the lookup parse boundary share one charset source of truth (`userIdentifier.ts`). `readSession.ts` rejects and removes any unparseable/wrong-shape/wrong-version record. A visitor editing their own `sessionStorage` only authenticates them as themselves-with-a-different-id in the client's own eyes - no server trusts this value, matching the documented BFF gap.

**3. Route guard.** No path found for an unauthenticated visitor to reach authenticated content or trigger an authenticated fetch. `requireSession(...)` runs synchronously as the authenticated loader's first statement, before the collection fetch can start. `resolveDestination.ts` closes the open-redirect surface via the real WHATWG `URL` parser comparing resolved origins, not a string-prefix heuristic - defeats protocol-relative and backslash-escaped values and parser-normalization tricks alike. The `withSessionGuard`/`isSessionGuarded` structural test (now fixed to resolve `lazy()`, per Codex-2) forecloses the parallel-loader race for any future child loader.

**4. Collection-fetch trade-off (M4).** The plaintext-password-bearing `/users.json` collection is not retained, logged, or rendered beyond momentary use. `signedInUserSchema.ts` strips `password` at the Zod parse boundary (tested directly in `parseSignedInUsers.test.ts`); `fetchSignedInUser.ts` returns only `{ displayName }`; the raw collection array goes out of scope and is garbage-collected. The store's cache holds only the resolved display name per user id, never the raw collection.

**5. Redaction.** Traced end to end: `createHttpClient.ts`'s `TimingRecord` carries the raw `/secrets/<SECRET>.json` path, but `createObservability.ts`'s `dispatch()` calls `sink(redact(record))` unconditionally before any record reaches a sink, and `redact.ts`'s path-segment rule replaces the segment after `secrets` with `[redacted]`. `redact.test.ts` asserts the exact transformation directly.

**6. Other injection surfaces.** No `dangerouslySetInnerHTML` anywhere in `src/` (grepped) - the displayed name and initials render as ordinary React-escaped JSX text. Open redirect closed per Q3. CSRF not applicable - a GET lookup with no body, no custom credential header, and no server-issued session cookie for a token to protect.

## Additional verification performed (no issues found)

- The narrowed guard-rails from ARCHITECTURE.md's decision log (`sessionStorage` ban narrowed to `createTabStorage.ts`, the `redirect`/`redirectDocument` import ban narrowed to `src/features/auth/guard/**`, the `/secrets` literal ban) are all present and correctly scoped in `eslint.config.js`.
- The live-smoke suite reads a real account's email/password from the public payload at runtime, derives the secret, and never logs or persists either value - only field *names* are printed diagnostically (invariant 116a/b), never values, and the resolved user id is no longer logged either (Codex-3 fix).
- `Avatar.tsx` sets `referrerPolicy="no-referrer"` on any future photo `<img>`, matching ARCHITECTURE.md's stated security posture for third-party avatar URLs.
