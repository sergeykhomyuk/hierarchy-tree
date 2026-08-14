# G1 spec validation - Codex second opinion (fresh thread)

4 findings (4 blocking)

1. The literal Playwright locale `'test'` is not accepted as an `Intl` locale and is also an invalid HTML language value for axe | SPEC.md invariants 13/17 and Playwright change | Installed Playwright 1.62.1 forwards the locale directly to Chromium's locale override; the local `Intl.getCanonicalLocales('test')` and `Intl.DateTimeFormat('test')` probes both threw `RangeError: Incorrect locale information provided`, and even if context creation succeeded, `lang="test"` would fail the `html-lang-valid` rule exercised by the accessibility and RTL specs. Use a valid tag such as `en-x-test`, then revise `Locale`, detection, and assertions accordingly. | BLOCKING

2. The generator contract never requires preserving the imported English catalogue | SPEC.md generator approach, conditional registration | An in-place recursive walker satisfies the described return shape but mutates the cached JSON module; after a test-locale registration, a later English runtime can receive key echoes instead of English, contradicting invariant 10. Require a non-mutating result and test that every source catalogue remains unchanged after generation and after test-then-English registration. | BLOCKING

3. The spec says both feature `loadTranslations.test.ts` files need no change while the validation plan requires adding test-locale cases to them | SPEC.md invariant 16, testing plan | An implementer cannot satisfy both instructions, and leaving the tests unchanged provides no direct proof that the new conditional branch registers echoed resources under the test language. Amend invariant 16 to preserve the existing English cases while adding the test cases. | BLOCKING

4. The claimed generator chunk placement and size coverage are neither guaranteed nor tested | SPEC.md invariant 20, validation plan, .size-limit.json | A module statically imported by two lazy route graphs may be emitted as a shared chunk; the current budgets measure only named route and catalogue files, while `npm run size` does not prove where the generator landed or cover a new shared chunk. Add a manifest/build-output assertion and budget any resulting shared chunk, or relax the placement invariant and define a transitive lazy-graph budget. | BLOCKING

## Explicit assessment

1. Completeness: Not complete. It lacks the non-mutation requirement and a strategy for a browser-valid test locale. It also omits handling and measurement of a possible shared generator chunk.

2. Internal consistency: Not consistent. Invariant 16 contradicts the testing section. The claim that `lang="test"` and axe checks continue passing conflicts with the actual accessibility tooling.

3. Feasibility: Most named locations support the approach:
- The six named e2e files run only under `chromium`. The development project positively matches only `development-console.spec.ts` and `kit-route.spec.ts`; deployed positively matches only `deployed-smoke.spec.ts`.
- `createRuntime.ts`, `renderRoute.tsx`, the internationalization barrel, and both feature loaders are appropriate modification points.
- The literal `locale: 'test'` is not feasible as specified. Current application code does not pass `i18n.language` to an `Intl` constructor; the only application `Intl` usage is fixed to `'en'` in `ConfigurationErrorScreen.tsx`. The immediate risk is Playwright/Chromium's locale override itself, followed by invalid `document.lang` and axe.
- The proposed `loadTranslations.ts` conditional is correct for current timing: `createInternationalization` awaits initialization before returning, and `instance.language` is `'test'` when the dynamic catalogue import resolves. A direct installed-i18next probe confirmed registration and translation under that language. This remains correct only if the generator does not mutate `catalogue.default`.

4. Testability: Not every invariant has a discriminating check as written. Locale detection, catalogue shape, missing-key behavior, runtime wiring, English preservation, and key echoes are unit-testable. Browser locale behavior is testable only after choosing a valid locale tag. Chunk placement requires a manifest assertion; `npm run size` alone is insufficient.

Sign-off: Not ready. All four findings should be resolved in the spec before user sign-off.

No files were modified. No full suite was run because the implementation does not exist; review evidence came from current source/configuration plus read-only `Intl` and i18next probes.

---
Note from driving session: Codex-1's core factual claim (Intl.getCanonicalLocales('test') throws RangeError) was independently re-verified via direct node execution and confirmed correct. Codex's suggested replacement tag 'en-x-test' was considered alongside 'qtz' and 'pseudo'; the user chose 'pseudo' (verified valid, single-segment, no detection-algorithm change needed, more readable than 'qtz' or 'en-x-test').
