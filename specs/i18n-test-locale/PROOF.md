# Proof of completion: i18n-test-locale

## Task

Add a key-echoing i18next locale for unit and e2e tests (its translation function returns the
key's own dot-path as the string, e.g. `t('notFound.title') === 'notFound.title'`), generated
from the real English catalogues (never hand-authored, to avoid drift). Make it the default
locale for `buildTestRuntime` (unit tests) and Playwright's `chromium` project (e2e). Add a
`Locale` const-object enum naming the supported locales, and a pure `detectLocale` helper that
resolves a real visitor's browser locale and falls back to English when unsupported - wired for
real into `createRuntime.ts`, replacing a hardcoded `'en'` constant.

The locale's underlying BCP-47 tag went through two corrections during G1/G4 review: `'test'`
(invalid syntax, `Intl.getCanonicalLocales` throws) → `'pseudo'` (syntactically valid but not
IANA-registered, fails axe-core's `html-lang-valid` rule - caught by running real axe-core, not
by inspection) → `'zxx'` (IANA-registered ISO 639-2 for "no linguistic content", verified valid
against both `Intl` and a real axe-core run).

## Requirements -> evidence

SPEC.md's 20 numbered invariants, each mapped to the test/check that proves it and its result.

- **Invariant 1** (`Locale` enum, exactly two members, `Test: 'zxx'`, verified BCP-47/axe-valid):
  `src/platform/internationalization/locale.ts`, `locale.test.ts` - 2/2 passing
  (`evidence/step1-green.txt`).
- **Invariants 2-5** (`detectLocale` subtag matching, fallback, preference order, purity):
  `src/platform/internationalization/detectLocale.ts`, `detectLocale.test.ts` - 4/4 passing
  (`evidence/step2-green.txt`).
- **Invariants 6-7** (generator non-mutating, fully-populated bundle):
  `src/platform/internationalization/createKeyEchoCatalogue.ts`,
  `createKeyEchoCatalogue.test.ts` - 2/2 passing (`evidence/step3-green.txt`); real-catalogue +
  mutation-sequence coverage in `loadTranslations.test.ts` (both features,
  `evidence/step5-green-auth.txt`, `step5-green-hierarchy.txt`); `vitest.setup.ts`'s
  `missingKeyReports` assertion held across the full 281-test suite
  (`evidence/g3-verify.txt`).
- **Invariant 8** (`createRuntime.ts` wiring + `common`-catalogue echo, including the mid-implementation
  correction found via real e2e): `src/app/composition/createRuntime.ts`, `createRuntime.test.ts` -
  6/6 passing (`evidence/step4-green.txt`, `step7-createRuntime-common-echo-green.txt`); real e2e
  `accessibility.spec.ts` axe-clean against `lang="zxx"` in a real browser
  (`evidence/g3-e2e.txt`).
- **Invariants 9-10** (`loadTranslations.ts` registers under active language, echoes only under
  `Locale.Test`): both features' `loadTranslations.ts` + `.test.ts` - 6/6 passing across both files
  (`evidence/step5-green-auth.txt`, `step5-green-hierarchy.txt`).
- **Invariants 11-12** (`buildTestRuntime` defaults to `Locale.Test`, echoes propagate through
  `renderRoute`): `src/app/testing/renderRoute.tsx`; proven by composition of `loadTranslations.test.ts`
  + the six updated component tests + e2e `placeholder-routes.spec.ts`
  (`evidence/step6-green.txt`, `evidence/g3-e2e.txt`).
- **Invariant 13** (`lang`/`dir` derivation needs no code change): `ApplicationRoot.test.tsx`
  - 2/2 passing (`evidence/step6-green.txt`); e2e `placeholder-routes.spec.ts` confirms
  `lang="zxx"` in a real browser (`evidence/g3-e2e.txt`).
- **Invariant 14** (six existing unit tests updated to key-echo assertions):
  `ErrorSurface.test.tsx`, `RootErrorBoundary.test.tsx`, `RouteErrorBoundary.test.tsx`,
  `ApplicationLayout.test.tsx`, `NotFoundRoute.test.tsx`, `ApplicationRoot.test.tsx` - 10/10 passing
  (`evidence/step6-green.txt`).
- **Invariant 15** (`bootstrap.test.tsx` needs no change): unmodified, passing in the full suite
  (`evidence/step4-full-suite.txt`, `g3-verify.txt`).
- **Invariant 16** (both `loadTranslations.test.ts` gain a new case, existing case unchanged):
  both files - 6/6 passing, existing `language: 'en'` cases untouched
  (`evidence/step5-green-auth.txt`, `step5-green-hierarchy.txt`).
- **Invariants 17-18** (Playwright `locale: 'zxx'`, six e2e specs updated, RTL comment revised):
  `playwright.config.ts`, six `e2e/*.spec.ts` files - real chromium project run 12/12 passing
  (`evidence/step7-e2e-run.txt`, `g3-e2e.txt`).
- **Invariant 19** (no new production dependency): `package.json` untouched; dependency
  allow-list test passing unmodified (`evidence/g3-verify.txt`).
- **Invariant 20** (size budgets hold, no unbudgeted chunk): `npm run size` - all 7 budget
  entries pass, entry 112.84 kB / 150 kB limit (`evidence/step7-size.txt`, `g3-verify.txt`);
  independently confirmed via a pre-feature worktree chunk-hash diff that no new/changed chunk
  was introduced (loop-verifier's G3 report).
- **Non-goals** (no locale-switcher UI; `deployed-smoke.spec.ts`, `ConfigurationErrorScreen.tsx`,
  `development` Playwright project untouched): confirmed via `git diff` against the pre-feature
  commit showing zero changes to any of the four (loop-verifier's G3 report,
  `evidence/step7-e2e-development-project.txt`).

## Verification summary

- Full suite: `npm run test` -> green, 67 test files / 281 tests
  (`evidence/g3-verify.txt`, 2025-08-14).
- `npm run verify` (typecheck + lint + format:check + test:coverage + build + verify:build +
  size): all clean, coverage 96%+ across statements/branches/functions/lines
  (`evidence/g3-verify.txt`).
- e2e flows exercised: both placeholder routes, not-found, a forced route-chunk failure
  recovering via the error boundary, the telemetry buffer sink, a clean console on every flow,
  an axe scan per route (including the `lang="zxx"` proof), RTL mirroring, and the
  development-only kit route - 19/19 passing (chromium 12/12 + development 7/7),
  `evidence/g3-e2e.txt`.
- Traces/screenshots: `specs/i18n-test-locale/evidence/traces/`.
- Design comparison: not applicable (no design track, no user-facing UI surface - `design: false`).

## Reviews

- Claude fresh-context review: 2 findings, 1 fixed (2 real `as`-casts replaced with a type
  guard), 1 rejected as false (stale-context reviewer error, verified via `git show`). Fix
  confirmed CONFIRMED in a second pass. `evidence/reviews/g4-claude-review.md`.
- Codex second opinion: 5 findings (2 blocking), 1 blocking fixed (same cast issue Claude
  found independently), 1 blocking + 2 non-blocking accepted (unreachable given the type
  system / no in-app locale switching exists), 2 non-blocking fixed (test-completeness
  additions). Fix confirmed CONFIRMED in the same thread, which independently re-ran
  `vitest`/`tsc` itself. `evidence/reviews/g4-codex-review.md`.
- Security pass: not flagged (`security_review: false` - no auth, secrets, input parsing,
  permissions, or PII surface touched).

## Known limitations / accepted findings

- `createKeyEchoCatalogue`'s recursive walker would mishandle an array/null/non-string leaf at
  runtime - accepted, unreachable through the type system for any real i18next catalogue,
  present or future (Claude-2/Codex-1).
- `loadTranslations.ts`'s per-instance dedup would reuse a stale registration if an instance's
  language ever changed post-construction via `changeLanguage()` - accepted, nothing in this
  codebase calls `changeLanguage`, matches the explicit non-goal that no in-app locale
  switching exists (Codex-3). Revisit if a locale-switcher UI is ever built.
- G1 review found and fixed a spec defect during implementation (step 3): the generator's own
  unit test could not import real app/feature catalogue JSON directly due to the platform layer
  boundary rule (platform cannot import app/feature, even in test files) - resolved with a
  synthetic fixture catalogue instead; real-catalogue coverage moved to `loadTranslations.test.ts`.
- Step 7 discovered `createRuntime.ts` wired `detectLocale` into the runtime language but never
  echoed the `common` catalogue it registers directly (not routed through `loadTranslations.ts`) -
  found by running the real e2e suite, fixed with its own red/green cycle, documented in SPEC.md
  invariant 8.
