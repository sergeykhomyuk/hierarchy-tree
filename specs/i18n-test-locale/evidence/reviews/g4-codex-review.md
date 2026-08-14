# G4 review - Codex second opinion (fresh thread), initial pass

5 findings (2 blocking)

1. BLOCKING - `createKeyEchoCatalogue` does not preserve catalogue structure for arrays or `null`: arrays become keyed objects and `null` throws, contradicting the shape-agnostic contract. `src/platform/internationalization/createKeyEchoCatalogue.ts:1-15`, SPEC invariant 6. ACCEPTED - user confirmed: unreachable through the type system for any real catalogue, present or future; no fix.

2. BLOCKING - the new tests contain five prohibited type assertions, including `as Catalogue` and `as Catalogue | undefined`. `createKeyEchoCatalogue.test.ts:14,25,66`; both `loadTranslations.test.ts` files `:43-45`. FIXED - 2 real narrowing casts (lines 14, 25) replaced with an `isRecord()` type guard; the other 3 were safe `as unknown` widening, not violations, left as-is.

3. non-blocking - feature-catalogue deduplication is keyed only by i18next instance, so changing an existing instance's language would permanently reuse its first registration. `loadTranslations.ts:10-27` (both features). ACCEPTED - user confirmed: nothing in this codebase calls `changeLanguage` anywhere, matches R11's non-goal (no in-app locale switching exists).

4. non-blocking - the `Locale` test does not enforce invariant 1's "exactly two members" requirement. `locale.test.ts:4-8`. FIXED - added a dedicated test.

5. non-blocking - the malformed-candidate test covers only an empty string, not a leading-dash case. `detectLocale.test.ts:11-15`. FIXED - added `'-zxx'` to the existing fallback test.

Verdict: not ready to merge as-is; first preserve or explicitly reject all supported JSON catalogue shapes and remove the prohibited type assertions.

---

## Fix-confirmation pass (same thread, resumed per codex-contract.md's "confirming a fix continues the raiser's thread" rule)

Verdict: CONFIRMED

1. Yes - `isRecord` performs genuine runtime narrowing (`typeof value === 'object' && value !== null`), both access sites gated behind it. No casts or unsafe equivalents remain.
2. The three `JSON.parse(...) as unknown` assertions are NOT violations of the finding's intent - safe `any`->`unknown` widening.
3. Both new test additions discriminate correctly against the named regressions.
4. No new issue introduced. Independently ran `npx vitest run src/platform/internationalization/` (7 files, 16 tests, all passed) and `npx tsc -b` (exit 0, no diagnostics) inside the actual fix-confirmation pass.

New findings: none.
