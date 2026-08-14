# Plan: i18n-test-locale - Key-echoing test locale, locale enum, browser-locale detection

## Brief

Add a `Locale` const-object enum (English/Test), a generated key-echoing `test` catalogue (tag `'zxx'`,
non-mutating, derived from the real English catalogues so it never drifts), a `detectLocale` helper wired
for real into `createRuntime.ts`, and make the test locale the default for `buildTestRuntime` (unit tests)
and Playwright's `chromium` project (e2e). See `SPEC.md` for the full 20-invariant behavior spec and the
G1 review history (7 findings across 2 rounds, all resolved - notably the locale tag went through two
corrections: `'test'` -> `'pseudo'` -> `'zxx'`, the last verified via both `Intl` and a real executed
axe-core run).

## Steps

Each step's tests trace to SPEC.md invariants by number. Full list per step below; `loop step add` calls
follow.

1. **`Locale` const-object enum** (`src/platform/internationalization/locale.ts`) - invariant 1.
   Tests: `locale.test.ts::Locale > exposes English and Test members with the correct string values`
2. **`detectLocale` helper** (`src/platform/internationalization/detectLocale.ts`) - invariants 2, 3, 4, 5.
   Tests: `detectLocale.test.ts::detectLocale > matches a region-qualified candidate to its base subtag`,
   `detectLocale.test.ts::detectLocale > falls back to English when no candidate matches`,
   `detectLocale.test.ts::detectLocale > respects preference order over match order`
3. **`createKeyEchoCatalogue` generator** (`src/platform/internationalization/createKeyEchoCatalogue.ts`) -
   invariants 6, 7. Tests:
   `createKeyEchoCatalogue.test.ts::createKeyEchoCatalogue > replaces every leaf with its own dot-path key`,
   `createKeyEchoCatalogue.test.ts::createKeyEchoCatalogue > never mutates the source catalogue`
4. **Wire `detectLocale` into `createRuntime.ts`** - invariant 8.
   Tests: `createRuntime.test.ts::createRuntime > resolves the runtime language from navigator.languages`
5. **Fix `loadTranslations.ts` (both features): register under the active language, echo under
   `Locale.Test`** - invariants 9, 10. Tests:
   `loadTranslations.test.ts::loadTranslations > registers the key-echoed catalogue under Locale.Test`
   (auth), `loadTranslations.test.ts::loadTranslations > registers the key-echoed catalogue under
   Locale.Test` (hierarchy)
6. **`buildTestRuntime` defaults to `Locale.Test`; update every dependent unit test assertion** -
   invariants 11, 12, 13, 14. Tests (updated in place, key-echo assertions are this step's red-first
   tests against the current English-defaulted `buildTestRuntime`):
   `ErrorSurface.test.tsx::ErrorSurface > renders the localized error copy`,
   `RootErrorBoundary.test.tsx::RootErrorBoundary > renders the error surface on a caught error`,
   `RouteErrorBoundary.test.tsx::RouteErrorBoundary > renders the error surface on a route error`,
   `ApplicationLayout.test.tsx::ApplicationLayout > renders the skip link`,
   `NotFoundRoute.test.tsx::NotFoundRoute > renders the not-found copy`,
   `ApplicationRoot.test.tsx::ApplicationRoot > sets the document language and direction`
7. **Playwright `locale: 'zxx'` on the `chromium` project; update the six affected e2e specs and the
   `right-to-left.spec.ts` comment** - invariants 17, 18. e2e, run via `npm run e2e -- --project=chromium`
   rather than a registered unit-test name (Playwright specs aren't named the same way; red/na recorded
   against the real e2e run per `loops/gates.md`'s e2e-evidence convention).

Invariants 15, 16, 19, 20 are verification-only (no code change needed for 15/16; 19/20 are proven at
Verify by running the real suite/build, not by a dedicated step) - covered in Verification below, not as
separate steps.

## Verification

`npm run verify` (typecheck + lint + format:check + test:coverage + build + verify:build + size) plus
`npm run e2e -- --project=chromium` for the six updated specs and `right-to-left.spec.ts`'s axe-clean
assertion (proves invariant 1's `lang="zxx"` choice holds under a real browser, not just `Intl`/axe-core
run directly). Explicit checks: `bootstrap.test.tsx` and both `loadTranslations.test.ts` files' *existing*
English cases stay green unmodified (invariants 15, 16); `npm run size` output inspected against
`.size-limit.json` for any new/unbudgeted chunk (invariant 20); the dependency allow-list test passes
unmodified (invariant 19). Evidence captured under `specs/i18n-test-locale/evidence/`.
