# Spec: i18n-test-locale - A key-echoing test locale for unit and e2e tests

## Summary

Add a key-echoing i18next locale (`Locale.Test`, underlying tag `'zxx'`) whose translation function returns each key's own dot-path as its value, generated from the real English catalogues rather than hand-authored - then make it the default locale everywhere tests build a runtime, so test assertions check catalogue *structure* instead of a hand-copied, driftable English string. Alongside it: a `Locale` const-object enum naming the two supported locales, and a pure `detectLocale` helper that resolves a real visitor's `navigator.languages` to a supported locale (always `Locale.English` today, since no real browser reports `'zxx'`).

**G1 revision note:** this spec was revised after G1 review, in two rounds. Round 1 changed the locale's underlying string value from the originally proposed `'test'` to `'pseudo'` - `'test'` is not syntactically valid BCP-47 (`Intl.getCanonicalLocales('test')` throws `RangeError`, confirmed by direct execution). Round 2 (a Codex fix-confirmation pass) found `'pseudo'` itself, while syntactically valid, is NOT a registered IANA language subtag, and fails axe-core's `html-lang-valid` rule for exactly that reason (verified by running real axe-core 4.13.0 against `<html lang="pseudo">` directly - a genuine violation, not a guess) - so the value changed again, to `'zxx'`. `'zxx'` is a real, IANA-registered ISO 639-2 code (meaning "No linguistic content; Not applicable" - an apt, if coincidental, fit) that passes both `Intl.getCanonicalLocales`/`Intl.DateTimeFormat` AND a real axe-core `html-lang-valid` run, verified directly rather than assumed. It is single-segment, so it needs no change to the subtag-splitting detection design. See `evidence/reviews/g1-claude-validator.md` and `evidence/reviews/g1-codex-review.md` for the full findings this revision addresses.

## Behavior (numbered invariants)

1. `Locale` is exported as an `as const` object from `src/platform/internationalization/locale.ts` (re-exported from the barrel) with exactly two members: `English: 'en'` and `Test: 'zxx'`. Its derived type is the union of those two string literals - never a TypeScript `enum`, never a bare literal union declared by hand. `'zxx'` is a real, IANA-registered ISO 639-2 subtag meaning "no linguistic content; not applicable" (verified: `Intl.getCanonicalLocales('zxx')` and `new Intl.DateTimeFormat('zxx')` both succeed with no exception, AND a real axe-core 4.13.0 run against `<html lang="zxx">` reports zero `html-lang-valid` violations) - unlike a merely syntax-valid-but-unregistered tag, which passes `Intl`'s grammar check but fails axe's registry-based one. No real visitor's browser reports `'zxx'` as a language preference, since it does not correspond to a spoken language.
2. `detectLocale(candidates)` returns the value of whichever `Locale` member matches the base subtag (the segment before the first `-`, lower-cased) of the *first* candidate in `candidates` whose base subtag is supported. Region/script subtags are ignored: `'en-US'`, `'en-GB'`, and `'EN'` all resolve to `Locale.English`.
3. `detectLocale(candidates)` returns `Locale.English` when `candidates` is empty, when no candidate's base subtag matches any `Locale` member, or when a candidate is malformed (empty string, no subtag before `-`).
4. `detectLocale` respects preference order: given `['fr-FR', 'zxx', 'en']`, it returns `Locale.Test`, because `'zxx'` is the first candidate (in list order) whose base subtag is supported - not `Locale.English`, even though `'en'` appears later and would also match.
5. `detectLocale` is a plain, synchronous, framework-free function - no React import, no DOM read beyond its argument - mirroring `localeDirection.ts`'s shape. It is not a hook; nothing in this feature adds a component-level caller.
6. A generated test catalogue exists for each of the three real English catalogues (`src/app/locales/en/common.json`, `src/features/auth/locales/en/auth.json`, `src/features/hierarchy/locales/en/hierarchy.json`): every leaf string is replaced by its own dot-path key (e.g. `{ notFound: { title: "Page not found" } }` becomes `{ notFound: { title: "notFound.title" } }`), produced by one generic, catalogue-shape-agnostic function applied to each catalogue - never by a hand-authored JSON file that can drift from the English source. **The generator never mutates its input.** It builds and returns a new object tree; the source catalogue module (a cached JSON import, shared across every caller in the process) is byte-for-byte unchanged after generation, including after a `Locale.Test` registration is followed by a `Locale.English` registration in the same process - an in-place walker would corrupt the shared cached import and silently break invariant 10.
7. The generated test catalogue is a fully populated, registered i18next resource bundle for every key that exists in the corresponding English catalogue. Nothing relies on i18next's own missing-key fallback to produce the echo. Consequently, rendering any string under `Locale.Test` never triggers `missingKeyHandler`, and `vitest.setup.ts`'s `expect(missingKeyReports).toEqual([])` (its `afterEach`) keeps passing for every test that renders under the test locale.
8. `src/app/composition/createRuntime.ts` derives the runtime's i18next language at boot by calling `detectLocale(navigator.languages)`, replacing the hardcoded `RUNTIME_LANGUAGE = 'en'` module constant. A real visitor's browser - which never reports `'zxx'` as a language preference - still resolves to `Locale.English` today, so this is a live code path with no observable change for real users, not a behavior change pending on a second product locale. **This exact wiring is directly tested**, not inferred from `detectLocale`'s isolated unit coverage: `src/app/composition/createRuntime.test.ts` (which already exists, 4 tests today) gains a case that stubs `navigator.languages` and asserts the resulting runtime's `i18n.language` - proving `createRuntime.ts` actually calls `detectLocale` with the right argument and actually threads its result into `language`, not merely that `detectLocale` itself is correct in isolation.
9. `src/features/auth/loadTranslations.ts` and `src/features/hierarchy/loadTranslations.ts` register their namespace's resource bundle under the i18next instance's actual active language (`instance.language`), never the literal `'en'`. A runtime whose active language is anything other than `'en'` now receives its feature namespace, closing the latent bug where it silently received none.
10. When an i18next instance's active language is `Locale.Test`, `loadTranslations.ts` (both features) registers the key-echoed version of its own catalogue (the same generator as invariant 6). When the active language is anything else (`Locale.English` today, or an explicit `'en'` an instance was constructed with), it registers the real, unmodified English catalogue - so English-locale behavior is unaffected by this feature by construction, not by coincidence.
11. `src/app/testing/renderRoute.tsx`'s `buildTestRuntime` defaults to `Locale.Test` and builds its `common`-namespace resource via the generator (invariant 6), rather than passing the literal English `common.json` straight through.
12. Any unit test rendering through `renderRoute`/`buildTestRuntime` (the default path, no override) observes key-echoed strings for the `common` namespace immediately, and - once a route's `lazy()` has awaited that feature's `loadTranslations` - key-echoed strings for `auth`/`hierarchy` too, per invariants 9-10.
13. `src/app/ApplicationRoot.tsx`'s existing `lang`/`dir` derivation (`document.documentElement.lang = language; document.documentElement.dir = localeDirection(language)`, sourced from `runtime.i18n.language`) needs no code change: under `Locale.Test`, `lang` becomes `'zxx'` and `dir` stays `'ltr'` automatically, because `'zxx'` is not in `localeDirection.ts`'s right-to-left subtag set. `lang="zxx"` does not trip axe-core's `html-lang-valid` rule - verified by running real axe-core 4.13.0 against it directly (see invariant 1's verification note); `'zxx'` is a genuinely IANA-registered ISO 639-2 subtag, which is what axe's registry-based check actually requires (a merely syntax-valid-but-unregistered tag, e.g. the originally-considered `'pseudo'`, fails this specific check even though it passes `Intl`'s grammar-only validation).
14. Existing unit tests that asserted hardcoded English catalogue copy now assert the corresponding key-echo string instead, in: `src/app/error-boundary/ErrorSurface.test.tsx`, `src/app/error-boundary/RootErrorBoundary.test.tsx`, `src/app/error-boundary/RouteErrorBoundary.test.tsx`, `src/app/layout/ApplicationLayout.test.tsx`, `src/app/routing/routes/NotFoundRoute.test.tsx`, and `src/app/ApplicationRoot.test.tsx`'s `document.documentElement.lang` assertion (`'en'` becomes `'zxx'`). The last file was not in the original candidate list and was found by reading the current suite (see Tech approach).
15. `src/app/bootstrap.test.tsx` needs no change: it calls the real `bootstrap()`, which calls the real `createRuntime()` (not `buildTestRuntime`), and jsdom's default `navigator.languages` (`['en-US']`) resolves through `detectLocale` to `Locale.English` - so its existing English-copy assertions remain correct exactly as written.
16. `src/features/auth/loadTranslations.test.ts` and `src/features/hierarchy/loadTranslations.test.ts`: their existing case, which builds an i18next instance with an explicit `language: 'en'` via `createInternationalization` directly and asserts `hasResourceBundle('en', ...)`, needs no change - per invariant 10, an instance explicitly constructed with `language: 'en'` still registers the real, unmodified English catalogue. Each file additionally gains a NEW case building an instance with `language: Locale.Test` and asserting the registered bundle's values are key-echoed (per invariants 9-10). Both files change (a new test is added); neither file's *existing* case changes.
17. Playwright's `chromium` project (`playwright.config.ts`) gains a `locale: 'zxx'` context option. Every e2e spec that runs under that project and previously asserted hardcoded English copy now asserts the key-echo string instead: `e2e/accessibility.spec.ts`, `e2e/error-boundary.spec.ts`, `e2e/not-found.spec.ts`, `e2e/placeholder-routes.spec.ts`, `e2e/right-to-left.spec.ts`, `e2e/telemetry-buffer.spec.ts`. `placeholder-routes.spec.ts`'s `document.documentElement.lang` assertion changes from `'en'` to `'zxx'` accordingly (mirrors invariant 8/13 end to end in a real browser). Confirmed (G1): these six files are exactly the set of `e2e/*.spec.ts` files matched by the `chromium` project and excluded from `development`/`deployed` - no spec runs under more than one project, so this change cannot break an unlisted project.
18. `e2e/right-to-left.spec.ts`'s header comment - currently "English is the only shipped locale in this phase (invariant 65), so there is no product path that switches direction" - is updated to state that a second, non-product-facing `test` locale (`Locale.Test`, tag `'zxx'`) now exists, and that this spec's `forceDirection` mechanism (which overrides `dir` directly) remains independent of and unaffected by it. The RTL-mirroring assertions and mechanism themselves do not change.
19. No production runtime dependency is added, removed, or changed; the allow-listed dependency set (PRODUCT.md invariant 134) is untouched - `Locale`, `detectLocale`, and the catalogue generator are first-party, dependency-free modules.
20. `npm run size` is run after implementation and its real output recorded as evidence (PRODUCT.md invariant 112's budgets must still hold). This invariant does NOT claim which specific chunk the catalogue generator lands in - a module statically imported from two independent lazy route graphs (`features/auth`, `features/hierarchy`) may be emitted by Rollup as its own shared chunk rather than duplicated into each route's chunk, and `.size-limit.json`'s current budget entries do not name every possible chunk file. If `npm run size`/`verify:build` surfaces a new chunk not covered by an existing budget entry, or an existing budget is exceeded, that is a Verify-phase (G3) finding to resolve then (add a budget entry, or adjust the design if the chunk is unexpectedly large) - not a claim this spec can make in advance of a real build.

## Non-goals

- No locale-switcher UI or in-app locale-selection control is added. `Locale.Test` is reachable only through `buildTestRuntime`'s default and Playwright's `locale: 'zxx'` context option - never through a component, and never through a real browser's `navigator.languages` (R11).
- `e2e/deployed-smoke.spec.ts` and its Playwright `deployed` project are not touched. They exercise the real, deployed Cloudflare Pages URL and must keep asserting real English copy, because that is what a real visitor actually sees (R9).
- The Playwright `development` project (`e2e/kit-route.spec.ts`, `e2e/development-console.spec.ts`) does not gain a `locale: 'zxx'` option. Neither spec asserts locale-sensitive copy today (verified by reading both files), so there is nothing for the test locale to change there.
- `src/app/ConfigurationErrorScreen.tsx` is not touched. It renders before `createRuntime`/i18next exist by construction (configuration is invalid), reads the static English `common.json` directly as plain object properties, and is never reached through `renderRoute`/`buildTestRuntime`. It stays hardcoded English regardless of locale, exactly as before this feature - a separate, already-accepted design constraint, not a gap this loop introduces.
- `specs/phase-1-setup/TECH.md`'s cross-references to invariant 65 (e.g. line 526's "Locale plumbing (invariants 65, 66, 68)") are not edited. That document is the closed, historical record of the already-merged phase-1-setup loop.
- **G1 revision (Claude-1):** `ARCHITECTURE.md` §7 ("Deliberately not built"), `ROADMAP.md`'s carried copy of that same line, and `PRODUCT.md`'s separate "what's not built" list all currently state "a second locale... none is needed" with no product/test distinction - all three are edited by this spec (not left standing), alongside the decision log and invariant 65. See Tech approach's Decision-log text section for the exact wording of all five edits.

## Tech approach

### New modules (`src/platform/internationalization/`)

- **`locale.ts`** - new file, following this repo's existing const-object-enum pattern exactly (compare `src/shared/ui/skeletonSize.ts`):
  ```ts
  export const Locale = {
    English: 'en',
    Test: 'zxx',
  } as const;

  export type Locale = (typeof Locale)[keyof typeof Locale];
  ```
  (`'zxx'` replaces the originally proposed `'test'` - see the Summary's G1 revision note.)
- **`detectLocale.ts`** - new file, mirroring `localeDirection.ts`'s exact shape (`src/platform/internationalization/localeDirection.ts:1-16`, subtag-splitting via `.split('-')[0]?.toLowerCase()`). Iterates `candidates` in order; for each, checks whether its base subtag matches a `Locale` member via `Object.values(Locale).find(...)` (no `as`, no `any` - `.find` returning `Locale | undefined` is the type-safe path this repo's conventions require over a cast). Falls back to `Locale.English`.
- **`createKeyEchoCatalogue.ts`** - new file, the R2 generator. A generic recursive walker: `createKeyEchoCatalogue<Catalogue extends Record<string, unknown>>(catalogue: Catalogue): Catalogue`. Builds and returns a NEW object tree - never assigns into or otherwise mutates `catalogue` or any of its nested objects (G1/Codex-2: the source is a cached JSON module import shared across every caller in the process; mutating it would corrupt every other consumer, including a later English registration in the same run). For each entry, if the value is a `string`, the corresponding key in the new object is set to `[...path, key].join('.')`; if it is a nested plain object (checked with a local type guard, not a cast), the walk recurses into a new nested object; the return shape is structurally identical to the input; only leaf string *values* change, and the input is left exactly as it was. This is the ONE function R2 asks for - called separately against each of the three catalogues at each of their two call sites (below), not a combined "build all three test resources" function. **Implementation note (G1/Claude-3, non-blocking):** JSON-imported catalogue leaf strings may type as string literals rather than widened `string` under this project's `resolveJsonModule`-style import handling; before committing to the `Catalogue -> Catalogue` generic signature above, the implementer should confirm it type-checks against a real catalogue import without a cast (`as`/`any` are forbidden by this repo's conventions) - if it does not, the return type narrows to `Record<string, unknown>` (or a recursive `JsonObject`-style type) instead of the exact input type, which is an equally acceptable, still-cast-free signature.

Barrel `src/platform/internationalization/index.ts` (currently 6 lines, re-exports only) gains three lines: `export { Locale } from './locale'`, `export { detectLocale } from './detectLocale'`, `export { createKeyEchoCatalogue } from './createKeyEchoCatalogue'`.

**Why this layer, not `shared/testing`:** the generator is called from `src/features/auth/loadTranslations.ts` and `src/features/hierarchy/loadTranslations.ts`, both production modules bundled into real per-route chunks (not test-only files). `eslint.config.js`'s boundaries policy (`eslint.config.js:338-355`, the base non-test rule) technically permits a `feature` file to import `shared` even in production, so this would not fail lint - but `shared/testing` (`src/shared/testing/index.ts`) is otherwise exclusively fakes and test doubles (`createFakeClock`, `createFakeRandomness`, `createFakeTransport`) meant for test-only callers like `renderRoute.tsx`. Shipping one of its exports into a real route's production bundle would quietly break that folder's established meaning even where lint stays green. `platform/internationalization` is where the repo already puts small, pure, dependency-free i18n transforms with no test-only connotation (`localeDirection.ts`, `formatMissingKey.ts`), and every layer that needs the generator (`app`, `feature`) can already import `platform` in production code. This keeps the diff inside the pattern the repo already has rather than introducing a new cross-layer wrinkle.

### Modified modules

- **`src/app/composition/createRuntime.ts`** - delete line 26 (`const RUNTIME_LANGUAGE = 'en';`); import `detectLocale` from `@platform/internationalization`; change line 58 from `language: RUNTIME_LANGUAGE,` to `language: detectLocale(navigator.languages),`.
- **`src/features/auth/loadTranslations.ts`** and **`src/features/hierarchy/loadTranslations.ts`** - both currently at lines 20-23:
  ```ts
  async function registerCatalogue(instance: i18n): Promise<void> {
    const catalogue = await import('./locales/en/auth.json');
    instance.addResourceBundle('en', 'auth', catalogue.default);
  }
  ```
  becomes:
  ```ts
  async function registerCatalogue(instance: i18n): Promise<void> {
    const catalogue = await import('./locales/en/auth.json');
    const resource =
      instance.language === Locale.Test
        ? createKeyEchoCatalogue(catalogue.default)
        : catalogue.default;
    instance.addResourceBundle(instance.language, 'auth', resource);
  }
  ```
  (namespace name `'hierarchy'` and import path swapped in the hierarchy file). This single change satisfies R5 (register under the active language) and R2/R6's "transitively auth/hierarchy" claim together - R5's literal wording (fix the language key) is necessary but not sufficient on its own for the transitively-echoed claim, since the import path (`./locales/en/auth.json`) always loads the real English catalogue; the conditional echo is what makes the *content*, not just the *registration key*, correct under the test locale. Both facts are captured in this one code change, described together here rather than left implicit.
- **`src/app/testing/renderRoute.tsx`** - `buildTestRuntime` (lines 31-58) changes lines 54-58 from:
  ```ts
  const i18n = await createInternationalization({
    resources: { common: commonCatalogue },
    language: 'en',
    observability,
  });
  ```
  to:
  ```ts
  const i18n = await createInternationalization({
    resources: { common: createKeyEchoCatalogue(commonCatalogue) },
    language: Locale.Test,
    observability,
  });
  ```
  `commonCatalogue` (imported at line 15, unchanged path `../locales/en/common.json`) stays the single source of truth; only the resource passed to `createInternationalization` changes. No override parameter is added - every current `buildTestRuntime(...)` call site (`features.test.tsx:39`, `RootErrorBoundary.test.tsx:18`, `createApplicationRouter.test.ts:7`) needs no locale other than the default, so an unused override parameter is not introduced (see Open questions).
- **`playwright.config.ts`** - `chromiumProject` (lines 28-37) gains `locale: 'zxx'` inside its `use` block: `use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4173/', locale: 'zxx' }`. `developmentProject` and `deployedProject` are untouched.
- **e2e specs** (`e2e/accessibility.spec.ts`, `e2e/error-boundary.spec.ts`, `e2e/not-found.spec.ts`, `e2e/placeholder-routes.spec.ts`, `e2e/right-to-left.spec.ts`, `e2e/telemetry-buffer.spec.ts`) - each hardcoded English string literal (e.g. `"The hierarchy view isn't built yet"`, `'Page not found'`, `'Back to home'`, `'Something went wrong'`, `'Try again'`, `'Skip to main content'`, `'Sign in isn't built yet'`) is replaced with its dot-path key-echo equivalent (`'home.title'`, `'notFound.title'`, `'notFound.linkHome'`, `'errorSurface.title'`, `'errorSurface.retry'`, `'layout.skipLink'`, `'login.title'`), read off the real catalogue key each component's `t(...)` call already names (verified per-component: `HierarchyPlaceholderPage.tsx:8,12`, `AuthPlaceholderPage.tsx:8,12`, `NotFoundRoute.tsx:9-10`, `ErrorSurface.tsx:16,19`, `ApplicationLayout.tsx:11`). `placeholder-routes.spec.ts:18,42` (`toHaveTitle('Hierarchy')` / `toHaveTitle('Sign in')`) become `toHaveTitle('home.documentTitle')` / `toHaveTitle('login.documentTitle')`; `placeholder-routes.spec.ts:24` (`lang === 'en'`) becomes `lang === 'zxx'`.
- **`e2e/right-to-left.spec.ts`** - the block comment at lines 7-27 is revised to state that a `test` locale (tag `'zxx'`) now exists but is not product-facing, per invariant 18; the `ROUTES` heading strings (lines 29-30) switch to key-echo values alongside the other specs.
- **`src/app/ApplicationRoot.test.tsx:29`** - `expect(document.documentElement.lang).toBe('en')` becomes `.toBe('zxx')`; found while reading the current suite, not in the original candidate list.
- **`src/app/composition/createRuntime.test.ts`** (G1/Claude-2) - gains a new test case: stub `navigator.languages` (e.g. via `vi.stubGlobal` or an equivalent already used elsewhere in this suite) to a value that should resolve to `Locale.Test`, call the real `createRuntime`, and assert `runtime.i18n.language === Locale.Test` - proving the actual wiring, not just `detectLocale`'s isolated correctness.

### Data flow

```mermaid
graph LR
    nav["navigator.languages<br/>(real browser)"] --> detect["detectLocale()"]
    detect --> locale["Locale.English<br/>(always, today)"]
    locale --> runtime["createRuntime.ts<br/>createInternationalization()"]

    pw["Playwright locale: 'zxx'<br/>context option"] --> browserlang["reported navigator.languages"]
    browserlang --> detect

    btr["buildTestRuntime()<br/>(default, no override)"] --> testlocale["Locale.Test"]
    testlocale --> gen1["createKeyEchoCatalogue(common.json)"]
    gen1 --> runtime2["createInternationalization()<br/>(test runtime)"]

    testlocale -.instance.language.-> lt["loadTranslations() per feature"]
    lt --> gen2["createKeyEchoCatalogue(feature catalogue)<br/>when language === Locale.Test"]
    gen2 --> bundle["addResourceBundle(instance.language, ns, resource)"]
```

Ownership: `Locale`/`detectLocale`/`createKeyEchoCatalogue` live in `platform/internationalization`, which stays domain-free and imports nothing from `app`/`feature`/`shared` (unchanged - `eslint.config.js:362-365`'s platform-can-only-import-platform rule is untouched by this design). `app` (`createRuntime.ts`, `renderRoute.tsx`) and each `feature`'s own `loadTranslations.ts` are the only callers, matching the existing dependency direction.

### Decision-log text (R12)

G1 (Claude-1) found three more places besides the decision log + invariant 65 that state "a second locale is deliberately not built" with no product/test distinction. All five are edited together so no stale, now-contradicted claim is left standing.

**`specs/ARCHITECTURE.md`** - new entry appended to the decision log (section 6), after the existing "English-only i18n with full infrastructure" entry (`specs/ARCHITECTURE.md:168`), which today reads:

> - **English-only i18n with full infrastructure** - the pipeline is what is expensive to retrofit; a second catalogue is not. Shipping a token second locale would prove less than exercising the real one.

Proposed new entry (does not edit the line above - adds after it):

> - **A key-echoing `test` locale ships in the same build that deploys to production** (2026-08-14, i18n-test-locale loop) - the entry above holds that a token second *product* locale would prove less than exercising the real one; this does not reopen that trade-off, because `test` is not a product locale at all. Unit and e2e assertions previously hardcoded a copy of the real English strings, which could drift silently whenever the catalogue's prose changed and the test's copy did not. `Locale.Test` (tag `'zxx'` - not `'test'` itself, which is not valid BCP-47 syntax and fails `Intl.getCanonicalLocales`) is a generated i18next resource bundle - one function walks each real English catalogue's key shape and replaces every leaf with its own dot-path, so `t('notFound.title')` resolves to the literal string `'notFound.title'` under it - which turns every such assertion into a structural check against the real catalogue instead of a hand-maintained copy of its prose. It is the default `buildTestRuntime` (`src/app/testing/renderRoute.tsx`) builds and the locale Playwright's `chromium` project requests via its context `locale` option; it is reachable only through those two paths, never through a real browser's language preference or an in-app control - `detectLocale` (`src/platform/internationalization/detectLocale.ts`) matches a visitor's `navigator.languages` against `Locale`'s members and falls back to `Locale.English` when nothing matches, which is what happens for every real visitor today, since `'zxx'` (ISO 639-2 for "no linguistic content") does not correspond to a spoken language and no real browser reports it. Rejected: keeping hand-authored English assertions, the status quo this entry replaces and the drift risk that motivated the change; and leaning on i18next's own missing-key fallback to echo keys, which `vitest.setup.ts`'s empty-`missingKeyReports` assertion forecloses - a real fallback reports every key as missing rather than echoing it silently.

**`specs/ARCHITECTURE.md`** section 7 ("Deliberately not built", `specs/ARCHITECTURE.md:187`) today reads:

> - **A second locale, SSR, a component library** - infrastructure supports each; none is needed to satisfy the goal.

Proposed replacement:

> - **A second *product* locale, SSR, a component library** - infrastructure supports each; none is needed to satisfy the goal. (A test-only locale for unit/e2e assertions ships separately - see the decision log.)

**`specs/ROADMAP.md:115`** - carried verbatim from the line above ("so that reading only this file does not lead somewhere it should not", per `specs/ROADMAP.md:108`) - gets the identical edit, for the identical reason:

> - **A second *product* locale, SSR, a component library** - the infrastructure supports each; none is needed. (A test-only locale for unit/e2e assertions ships separately - see ARCHITECTURE.md's decision log.)

**`specs/phase-1-setup/PRODUCT.md:224`** (a separate "what's not built" list from invariant 65) today reads:

> - A second locale, SSR and a component library. The infrastructure supports each; none is needed.

Proposed replacement:

> - A second *product* locale, SSR and a component library. The infrastructure supports each; none is needed. (A test-only locale ships separately - see ARCHITECTURE.md's decision log and invariant 65.)

**`specs/phase-1-setup/PRODUCT.md`** - invariant 65 (`specs/phase-1-setup/PRODUCT.md:100`) today reads:

> 65. English is the only shipped locale. The infrastructure carries no locale-specific branching, so adding a locale is adding a catalogue.

Proposed replacement text (same invariant number, amended wording):

> 65. English is the only shipped *product* locale - no in-app control ever selects a different one, and a real visitor's browser always resolves to it (`detectLocale` falls back to English whenever nothing in `navigator.languages` matches a supported locale). The infrastructure carries no product-facing locale-specific branching, so adding a second product locale is still adding a catalogue. A second locale, `test` (tag `'zxx'`), ships in the same build for unit and e2e tests only (see ARCHITECTURE.md's decision log): it is a generated, key-echoing catalogue reachable solely through `buildTestRuntime`'s default and Playwright's `chromium` project `locale` context option, never through a real browser or any UI control.

## Testing and validation

- **Unit** (Vitest, jsdom):
  - Invariants 1-5: `locale.test.ts` (member values, derived type shape via a compile-time check or `Object.values` assertion) and `detectLocale.test.ts` (table-driven, mirroring `localeDirection.test.ts`'s style: exact match, region-stripped match, first-preference-wins with a multi-candidate list, empty list, no-match list, malformed candidate).
  - Invariant 6-7: `createKeyEchoCatalogue.test.ts` against all three real catalogues (imported directly), asserting every leaf equals its own dot path, the key set is unchanged, AND (G1/Codex-2) the source catalogue object is unchanged after generation - by reference-equality-safe deep comparison against a snapshot taken before calling the generator, both immediately and after a subsequent `Locale.English`-then-`Locale.Test`-then-`Locale.English` registration sequence through `loadTranslations.ts`; plus the existing `vitest.setup.ts` `missingKeyReports` assertion (`vitest.setup.ts:21-23`) passing across the whole suite is itself the proof that invariant 7 holds globally, not just for one file.
  - Invariant 8 (G1/Claude-2): a NEW case in the existing `createRuntime.test.ts`, stubbing `navigator.languages` and asserting the resulting runtime's `i18n.language` directly - not inferred from `detectLocale`'s isolated coverage or a diff read.
  - Invariants 9-10: `loadTranslations.test.ts` (both features) gains a NEW case building an instance with `language: Locale.Test` and asserting the registered bundle's values are key-echoed, alongside the existing `language: 'en'` case (invariant 16) staying green unmodified - both cases live in the same file after this change.
  - Invariants 11-14: run the full suite (`npm run test`) after the listed files are updated; every one of R7's files plus `ApplicationRoot.test.tsx` green is the evidence.
  - Invariant 15: run `bootstrap.test.tsx` unmodified and confirm it still passes, as explicit evidence of "no change needed" rather than an assumption.
  - Invariant 19-20: `npm run build && npm run size`, output captured as evidence; the dependency allow-list test (PRODUCT.md invariant 134's unit test) passing unmodified is the evidence for invariant 19. For invariant 20, inspect `dist/`'s actual chunk manifest (or `verify:build`'s output) to confirm which chunk(s) the generator landed in, and record whether any chunk not already named in `.size-limit.json` appeared - do not assume the entry/route split held without checking.
- **E2E** (Playwright, per `VERIFICATION.md`'s flow list):
  - Invariant 17-18: run the `chromium` project after adding `locale: 'zxx'`, all six listed specs green with key-echo assertions; `right-to-left.spec.ts`'s axe-clean and no-horizontal-overflow assertions continue to pass under the new locale, proving the RTL mechanism is unaffected by the comment/heading-string changes. Axe-clean specifically proves `lang="zxx"` does not trip `html-lang-valid` (G1/Codex-1).
  - Non-goals: run `development` and `deployed` projects unmodified (or note they were not touched, since `deployed` requires a live URL) as evidence nothing leaked into them.
- **Lint**: `npm run lint` clean, in particular `eslint-plugin-boundaries` on the two modified `loadTranslations.ts` files and `renderRoute.tsx`'s new imports, and `i18next/no-literal-string` unaffected (no new user-visible literal is introduced - key-echo strings appear only in generated resources and test assertions, never in JSX).

## Risks

- **Silent content drift if the conditional-echo branch in `loadTranslations.ts` is skipped.** If a future edit re-hardcodes the import or drops the `instance.language === Locale.Test` check, feature-namespace strings would silently stop echoing while `common` still does, producing tests that pass but assert real English text under a nominal test locale. Mitigation: invariants 9-10's unit coverage asserts the echoed shape directly against each feature's real catalogue, not against a fixture, so a regression here fails loudly.
- **Bundle weight on feature route chunks.** The generator is now a static import inside two production files (`loadTranslations.ts` for both features), each bundled into its route's lazy chunk. The addition is small (a recursive object walk with no dependencies), but PRODUCT.md invariant 112's per-route chunk budget (30 kB gzipped) and lazy-catalogue-chunk budget (5 kB gzipped) are enforced numbers, not headroom assumed safe - `npm run size` must be run and its output recorded, not skipped.
- **`ApplicationRoot.test.tsx` and other unlisted assertions.** R7's file list was explicitly non-exhaustive; this spec found one omission (`ApplicationRoot.test.tsx:29`) by reading the current suite rather than trusting the list. The implementation step should re-run this same search (`grep -rn "toBe('en')" src`) after all listed edits land, in case another one was missed here too.
- **(G1/Codex-1, two rounds) Locale tag choice is load-bearing for browser/axe validity, not just detection logic, and syntax validity alone is not sufficient proof.** `'test'` failed `Intl`'s grammar check outright. `'pseudo'`, the first replacement, passed `Intl` but was independently found (via a real, executed axe-core 4.13.0 run, not inspection) to fail axe-core's registry-based `html-lang-valid` rule - a check `Intl.getCanonicalLocales` does not perform. `'zxx'`, the final choice, is a genuinely IANA-registered subtag verified against BOTH checks directly. Any future change to this value must be re-verified against both `Intl` AND a real axe-core run before use - syntactic validity alone (what `Intl` checks) is not sufficient evidence, as this spec's own revision history demonstrates.

## Open questions

1. Should `InternationalizationDependencies.language` (`createInternationalization.ts:9`, currently typed `string`) be tightened to `Locale` now that every call site passes one (`detectLocale(...)` or `Locale.Test`, plus two test files passing the literal `'en'`, which is assignable either way)? Recommendation: leave it `string` for this loop - it is a real, low-risk tightening but not something R1-R12 asked for, and the coding skill's "keep diffs surgical, refactors not asked for belong in their own change" argues for a separate change.
2. Should `buildTestRuntime` accept an optional `locale` override parameter instead of hardcoding `Locale.Test`? No current call site needs anything but the default (verified: `features.test.tsx:39`, `RootErrorBoundary.test.tsx:18`, `createApplicationRouter.test.ts:7`). Recommendation: no override parameter now; add one if and when a real test needs to render in English deliberately.
3. **Resolved (G1):** the proposed `ARCHITECTURE.md`/`ROADMAP.md`/`PRODUCT.md` decision-log-style entries use `(2026-08-14, i18n-test-locale loop)` as their date/context qualifier - this loop is not nested under a numbered phase directory (unlike `phase-1-setup`), so a loop-id qualifier is used in place of a phase number, matching the existing entries' pattern of "date + context" without inventing a phase number that doesn't apply here.
