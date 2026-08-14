# Tech spec: phase-2-login - the derivation, the lookup, the session, the guard, the header

## Context

### What exists today, and what phase 2 has to work inside

Phase 1 shipped the whole skeleton and deliberately left every login behaviour unbuilt. The
relevant surfaces, read rather than remembered:

**The two routes that change are placeholders.** `src/app/routing/routes/LoginRoute.tsx:1-4`
is four lines - a re-export of `AuthPlaceholderPage` and `loadTranslations` from
`@features/auth`. `src/features/auth/AuthPlaceholderPage.tsx:6-18` renders a `Card` with one
`h1` and one paragraph, and calls `useDocumentTitle(t('login.documentTitle'))`. The auth
catalogue (`src/features/auth/locales/en/auth.json:1-7`) holds exactly three keys, all of
which say the screen is not built yet. `src/features/auth/index.ts:1-2` exports two names.
The hierarchy side is the identical shape.

**The route table has no loaders.** `src/app/routing/routeDefinitions.ts:11-78` builds
`RouteObject[]` from `(instance: i18n, developmentRoutes: boolean)`. Each child is a `lazy()`
that awaits its feature's `loadTranslations(instance)` before returning `{ Component }`
(lines 18-33). Its own comment at lines 8-10 says "No loader, no guard, no redirect - this
phase's routes resolve to a component and nothing else (invariant 97)". The wildcard is
pushed last (lines 54-60), the dev-only `/__kit` route before it (lines 44-52), and the root
route carries `element: <ApplicationLayout/>`, `ErrorBoundary: RouteErrorBoundary` and
`HydrateFallback: () => null` (lines 62-78).

**The router is created from the runtime, outside React.**
`src/app/routing/createApplicationRouter.ts:9-14` takes `Runtime` and calls
`createBrowserRouter(routeDefinitions(runtime.i18n, runtime.configuration.developmentRoutes),
{ basename: runtime.configuration.basePath })`. This is the composition fact that makes
loaders possible at all: the runtime is already in scope at the point the route table is
built, so a loader can close over it without any global. `src/app/bootstrap.ts:49-51` builds
the runtime, then the router, then attaches the interaction tracker.

**`useRuntime` is React-only and app-only.** `src/app/composition/useRuntime.ts:5-10` reads
`RuntimeContext` (`src/app/composition/runtimeContext.ts:4`) and throws outside a provider.
It lives in `src/app/composition`, which a feature may not import - the boundaries policy
allows `feature -> shared-utils | shared | platform | same-feature` only
(`eslint.config.js:347-368`). So a component inside `features/auth` cannot reach the http
client through the runtime context; `app` has to hand it down. Loaders are worse: they run
outside React entirely, so `useRuntime` is not available to them under any arrangement.

**The runtime is built once per page load.** `src/app/composition/createRuntime.ts:31-78`
constructs randomness, clock, observability (attaching the buffer handle at
`globalThis.__hierarchyTreeTelemetry` when configured, lines 42-44), the interaction tracker,
the http client, and the i18next instance, and freezes the result. `Runtime` is
`{ configuration, observability, http, i18n, interactionTracker }`
(`src/app/composition/createRuntime.ts:23-29`). "Once per page load" is what makes it the
right home for anything invariant 97b wants held for a page's lifetime.

**The http client.** `createHttpClient(dependencies): HttpClient` with `request<Value>(request:
HttpRequest<Value>): Promise<HttpResult<Value>>` (`src/platform/http/createHttpClient.ts:32-34,
38-40`). `HttpRequest` (`src/platform/http/httpRequest.ts:3-11`) is
`{ method, resourcePath, searchParameters?, body?, signal?, timeoutMilliseconds?, parse }`,
where `resourcePath` is the template type `` `/${string}` `` (`src/platform/http/resourcePath.ts:1`)
and `parse: (payload: unknown) => Value` is the Zod seam. `HttpResult`
(`src/platform/http/httpResult.ts:3-6`) is the three-arm union success | failure | cancelled,
and `HttpFailure` (`src/platform/http/httpFailure.ts:1-5`) the four-member union
network | timeout | http | parse. The public entry
(`src/platform/http/index.ts:1-8`) exports the factory and all five types.

Behaviours phase 2 inherits unchanged and must not special-case (invariant 20): one deadline
per logical request armed once (`createHttpClient.ts:77-86`), signal composition through
`AbortSignal.any` (line 85), at most one retry gated by `shouldRetry` (lines 161-180), a
pre-aborted caller signal returning `{ outcome: 'cancelled' }` without a transport call
(lines 71-73), an abort mid-flight returning `cancelled` with a debug-level record rather
than a failure (lines 103-119), a non-2xx mapped to `{ kind: 'http', status, statusDescription }`
(`src/platform/http/performAttempt.ts:39-48`), and a `parse` throw mapped to `{ kind: 'parse' }`
with no payload attached (`performAttempt.ts:50-64`). The URL is built by
`buildUrl(apiBaseUrl, httpRequest)` (`src/platform/http/buildUrl.ts:3-14`) as
`new URL(resourcePath, apiBaseUrl)` plus search parameters, and the resolved URL's origin is
compared against the configured origin before anything is sent
(`createHttpClient.ts:63-69`) - the comment at lines 53-62 records why a `startsWith('//')`
prefix check is insufficient, which is a lesson invariant 68's `from` validation reuses
directly.

**One inherited behaviour is not what the retry predicate reads, and invariant 20 is worded
against the code rather than against the predicate.** `shouldRetry`
(`src/platform/http/shouldRetry.ts:4-7`) lists `timeout` among its retryable kinds, but the
kind is unreachable from `request`'s loop: `performAttempt` never returns a `timeout` failure
(its failure kinds are `network`, `http` and `parse`, `performAttempt.ts:32-63`), and a
deadline abort takes the `rawOutcome.kind === 'aborted'` branch and **returns**
`{ kind: 'timeout' }` at `createHttpClient.ts:121-133`, before line 161's retry test is ever
evaluated. So a timed-out lookup makes exactly one transport call. This is stated because the
opposite is easy to assume from the predicate, and because "fixing" the client so the
predicate becomes reachable would be a change to a module invariant 141 freezes. The test map
for invariant 20 asserts the one-call behaviour so the assumption cannot be reintroduced
quietly.

**Observability.** The facade is `{ logger, tracer, analytics }`
(`src/platform/observability/observabilityFacade.ts:7-24`). Everything funnels through one
private `dispatch(record)` that applies the level check and `redact` inside a single
`try/catch` (`src/platform/observability/createObservability.ts:32-44`). The typed event
catalogue is three entries today - `app.route_viewed`, `app.error_boundary_shown`,
`app.web_vital` (`src/platform/observability/analyticsEvents.ts:3-9`) - with
`AnalyticsEventName = keyof AnalyticsPayloads`. A timing record carries
`{ method, resourcePath, outcome, status?, durationMilliseconds, correlationId, attempt, requestId }`
(`src/platform/observability/timingRecord.ts:1-10`) and reaches the buffer as
`{ kind: 'timing', timing }` (`src/platform/observability/telemetryRecord.ts:6-14`).

**Redaction, and the hole phase 2 opens in it.** `redact`
(`src/platform/observability/redact.ts:1-60`) replaces the VALUE of any object key matching
`/password|secret|token/i` (line 32), and rewrites matching SEARCH PARAMETERS of any string
that parses as a URL (lines 43-59). It does nothing to a string that is not a URL, and
nothing to a value whose key does not match. The login lookup's resource path is
`/secrets/<SECRET>.json`: the key is `resourcePath` (which does not match the pattern), and
the value is not an absolute URL (so `new URL(value)` throws at line 46 and the string is
returned verbatim at line 48). The derived secret would therefore reach the ring buffer in
full, from `createHttpClient.ts:142-151`'s per-attempt timing record, and from the
`http.request_cancelled` debug record at lines 105-108. **Invariant 125 is not satisfied by
the existing redaction layer.** This is settled under "Proposed changes", section 3.

**Configuration and i18n.** `Configuration` is a frozen seven-key record
(`src/platform/configuration/configuration.ts:4-12`); the schema defaults every key
(`src/platform/configuration/configurationSchema.ts:8-25`) with `VITE_API_BASE_URL`
defaulting to `https://gongfetest.firebaseio.com`. i18next runs with `fallbackLng: false`,
`defaultNS: 'common'`, `saveMissing: true`, `appendNamespaceToMissingKey: true` and both
missing-key hooks registered (`src/platform/internationalization/createInternationalization.ts:17-36`);
`vitest.setup.ts:17-23` clears and then asserts `missingKeyReports` empty around every test,
so a surface asking for a key that does not exist fails the suite. `Locale.Test` is `'zxx'`
(`src/platform/internationalization/locale.ts:1-6`) and `createKeyEchoCatalogue`
(`src/platform/internationalization/createKeyEchoCatalogue.ts:3-5`) turns a real catalogue
into one whose leaves are their own dot paths - which is why every e2e assertion reads
`'login.title'` rather than prose (`e2e/placeholder-routes.spec.ts:41-44`), the Playwright
`chromium` project requesting `locale: 'zxx'` (`playwright.config.ts:28-41`).

**The UI kit, and what it does and does not offer this phase.**
`Button` (`src/shared/ui/Button.tsx:19-53`) takes `{ variant, type?, disabled?, busy?, onClick?, children }`;
when `busy` its handler calls `event.preventDefault()` and skips `onClick` (lines 27-39) - the
comment at lines 30-32 says why both halves are needed (skip the caller's `onClick` **and**
stop the native submit a `type="submit"` button would still perform); it names no phase and no
caller, so this spec's claim to be that caller is this spec's, not the comment's. It sets
`aria-busy`/`aria-disabled` without disabling, so focus survives. It renders `{children}` and
nothing else (lines 49-51): **there is no spinner**, and `VARIANT_CLASS.primary` is
`bg-primary text-on-primary hover:bg-primary-pressed` (line 14), so an un-hovered busy button
paints `--color-primary`, not the pressed violet mockup 1c shows. There is no `Spinner` in the
kit at all (`src/shared/ui/index.ts:1-13`). Invariants 30, 41 and 115 all presuppose one; see
section 7.
`Field` (`src/shared/ui/Field.tsx:14-48`) renders `<label htmlFor>`, publishes
`{ describedBy, invalid, required }` through `FieldContext` (lines 26-33), and renders a
field-level `<p role="alert">` whenever `error` is set (lines 42-46).
`Input` (`src/shared/ui/Input.tsx:5-37`) takes `{ id, name, type, value, onChange, autoComplete? }`
and consumes the context at line 22. It has **no `placeholder` prop, no `readOnly` prop and
no way to vary its border class** (line 35 is a fixed class string). `FieldContext` and its
value type are both exported from the kit entry (`src/shared/ui/index.ts:9-10`), as are
`deriveInitials`, `Skeleton`'s `SkeletonSize` and `sizeClass`.
`Avatar` (`src/shared/ui/Avatar.tsx:21-53`) falls back to `deriveInitials(displayName)` when
there is no image, and takes `decorative` to choose between `alt=""` and an accessible name.

**Theme and accessibility floors.** `--color-canvas-login: #f3eeff`
(`src/shared/theme/theme.css:14`) exists and is used by nothing today; `body` is painted
`--color-canvas-app` (lines 87-90). One global `:focus-visible` rule supplies every focus ring
(lines 92-95) and one `prefers-reduced-motion` block zeroes every animation and transition
(lines 97-105), so invariant 30 needs no per-component work. `contrastPairs.ts:7-15` lists
seven pairs the contrast test walks in both themes; none of them involves `canvas-login`.

**Enforcement that phase 2 collides with, deliberately.** These are phase 1 guards written to
fail if phase 2's work were started early; each has to be narrowed, in the milestone that
needs it, with the change recorded rather than slipped in.

- `eslint.config.js:35-43` bans `sessionStorage` as a bare global and `eslint.config.js:86-99`
  bans it as a member of `window`/`globalThis`/`navigator`, with **no override anywhere**.
  Phase 1's own TECH.md said "phase 2 removes the `sessionStorage` entries with a decision-log
  line"; `scripts/eslint-configuration.test.ts:52-95` asserts all five globals are banned in
  both forms, so the test moves with the rule.
- **Two** ESLint blocks ban importing `redirect` and `redirectDocument` from `react-router`,
  not one, and the second is the one that governs the guards. `eslint.config.js:549-571`
  (`files: ['src/**/*.{ts,tsx}']`) and `eslint.config.js:572-593`
  (`files: ['src/features/*/**/*.{ts,tsx}']`) carry the identical `importNames` list and the
  identical message "No loader, guard or redirect exists in this phase (invariant 97)". Flat
  config does not merge `rules` entries for the same rule - the later matching block's value
  replaces the earlier one - so for a file under `src/features/auth/guard/**` the *second*
  block is the effective configuration. Narrowing only the first leaves the guards failing
  lint. `scripts/eslint-configuration.test.ts:255-264` asserts lint fails on that import
  naming `invariant 97`; that message is also stale (it names a phase-1 invariant number that
  means something else in this spec's numbering), so both blocks need the message rewritten as
  well as the scope narrowed.
- `scripts/assert-domain-vocabulary.mjs:159-161` fails any file under `src/**` whose source
  contains the literal `/secrets`. Lines 16-26 additionally ban the words `user`, `session`,
  `login`, `credential`, `secret` (among others) in any EXPORTED identifier under
  `src/shared/**` or `src/platform/**`, and lines 29-34 ban the identifiers `make32` and
  `POISON_ARRAY` anywhere in `src/**`. Lines 36-48 hold the allow-lists. Test files are
  excluded from both scans (lines 115-117, 140-142).
- `e2e/telemetry-buffer.spec.ts:26` asserts `JSON.stringify(records)` does not match
  `/password|secret|token/i`, and lines 29-51 assert both storages are empty after visiting
  both routes.

**Test and budget apparatus.** Three Vitest projects - `platform` (node),
`ui` (jsdom, `src/{app,features,shared}/**/*.test.{ts,tsx}`) and `tooling`
(`vitest.config.ts:15-51`) - with coverage thresholds of 85% repository-wide and a
`'src/features/*/domain/**'` key already set to 100% on all four metrics
(`vitest.config.ts:63-73`). That glob matches nothing today and arms itself the moment a
`domain` directory appears, which decides where the derivation lives. Playwright runs against
the built `dist` served by `vite preview`, with a catch-all handler that **aborts every
cross-origin request** (`e2e/support/routeMocks.ts:13-28`); a later, more specific
`page.route` wins, which is how `e2e/error-boundary.spec.ts:16-23` intercepts one chunk.
`.size-limit.json` carries seven entries (150 kB entry+vendor, 15 kB stylesheet, 30 kB per
route, 5 kB per catalogue) and `build-output/expected-build-output.json` declares the same
list plus the route/catalogue chunk graph; `build-output/catalogue-chunks.test.ts:32-37`
asserts `LoginRoute.tsx`'s dynamic imports are **exactly** `['src/features/auth/locales/en/auth.json']`.
`scripts/repository-configuration.test.ts:343-361` pins the seven runtime dependencies
exactly (invariant 134's mechanism).

**The brief's algorithm.** `docs/task.md:29-57` holds the 256-entry `POISON_ARRAY` literal
and the `make32`/`encode` source. `docs/reference.md:47-51` records how the table was
recovered from the PDF and warns that "a structurally correct `encode` producing the wrong
bytes fails silently, so it also needs proving against one real account" - which is what
invariants 5, 6 and 6a encode.

**React Router's redirect semantics, verified against the installed 8.3.0.**
`node_modules/react-router/dist/development/lib/router/utils.js:774-777` exports a `replace(url, init)`
helper that builds a redirect Response and sets an `X-Remix-Replace: true` header;
`node_modules/react-router/dist/development/lib/router/router.js:1024` reads
`replace === true || redirect.response.headers.has("X-Remix-Replace") ? "REPLACE" : "PUSH"`.
The block comment at `router.js:981-999` states that history is not touched until redirects
are processed, "so we just use the history action from the original navigation (PUSH or
REPLACE)". Three consequences follow, and the third is the one that decides the guard's
design:

1. During an ordinary in-app PUSH navigation, a plain `redirect()` pushes the *redirect
   target* and the guarded URL never gets a history entry of its own - which is already what
   invariant 87 wants for that case, with no helper needed.
2. On an initial document load and on a POP, the guarded URL **is** the current entry, so a
   PUSH would leave it behind and Back from the login card would walk straight back into the
   guard. `replace()` is what fixes that case.
3. Therefore `replace()` applied unconditionally is **wrong for case 1**: it promotes the
   navigation to REPLACE, which overwrites the *referring* page's entry rather than the
   guarded URL's (there is no entry for the guarded URL yet), and Back then lands on whatever
   preceded the referrer. `e2e/not-found.spec.ts:18-24` already performs exactly this kind of
   navigation - its home link pushes to `/`, which this phase guards - so the wrong choice is
   reachable from the suite that exists today.

The discriminator between the two cases is available in the loader and is exact, precisely
because of the block comment above: during a client-side PUSH the browser's location has not
been touched yet and is still the *referring* page, while on an initial load and on a POP the
browser's location already **is** the guarded URL. Section 5.3 uses that comparison.

`replace()` is **not** on the `no-restricted-imports` ban list; `redirect` and
`redirectDocument` are, in both of the blocks named above.

**A loader's `request.url` carries no fragment.** `createClientSideRequest` builds it as
`history.createURL(stripHashFromPath(location)).toString()` (`router.js:2604-2605`), and
`stripHashFromPath` sets `hash: ""` (`router.js:2762-2767`). So `new URL(request.url).hash` is
always the empty string and a guard cannot recover the fragment of the URL it is refusing.
Invariant 84 is written against that fact rather than against the intent.

**A loader's returned promise is awaited before the route renders.** `callLoaderOrAction`
resolves `{ type: "data", result: await actualHandler() }` (`router.js:2441-2446`), so a
loader that returns a bare promise blocks the navigation until it settles - no Suspense
fallback is ever shown, and the "loader starts the fetch, `use()` suspends" pattern collapses
into a blocking loader. Only a promise held **inside** a synchronously returned object
survives to the component unresolved. Section 6 returns `{ signedInUser: <promise> }` for that
reason.

Behaviour is PRODUCT.md's; nothing above restates it.

## Proposed changes

### 1. File layout

Naming follows phase 1's conventions (one public symbol per module, the filename is that
symbol, `PascalCase.tsx` for components, `lowerCamelCase.ts` for everything else, kebab-case
directories, named exports only, `memo` with a named inner function, a co-located `FooProps`
above each component). New and changed files only; everything else is untouched.

```
src/
  features/auth/                            [feature]
    index.ts                                CHANGED - the single public entry (1.1)
    LoginPage.tsx                           the card, all five states (+ LoginPageDependencies, 1.2)
    LoginAlert.tsx                             internal - the no-match / service-problem block
    ProductMark.tsx                            internal - the violet tile + wordmark
    loginCardState.ts                          pure: (result, pending, ready) -> LoginCardState
    useLoginSubmission.ts                      useActionState wiring + the single-flight guard
    loadTranslations.ts                     unchanged
    locales/en/auth.json                    CHANGED - the phase's auth strings (8)
    domain/                                 <- arms vitest.config.ts:67's 100% threshold
      substitutionTable.ts                     the 256-entry literal (2)
      substitutionTableChecksum.ts             pure FNV-1a over a number list
      normalizeToCodeUnits.ts                  invariant 3
      deriveSecret.ts                          invariants 1-4, 7-11
      derivedSecret.ts                         type DerivedSecret (branded)
      userIdentifier.ts                        type UserIdentifier (branded), invariant 18a
    data/
      secretResourcePath.ts                    (secret) -> ResourcePath
      userResourcePath.ts                      (id) -> ResourcePath
      lookupResultSchema.ts                    Zod: null | charset-restricted string | finite integer (18a)
      lookupUserIdentifier.ts                  the ONE request (invariants 13-22)
      signedInUserSchema.ts                    Zod, drops `password` at the boundary (97a)
      signedInUserView.ts                      type SignedInUserView
      fetchSignedInUser.ts                     the one-record fetch (97)
      createSignedInUserStore.ts               per-runtime memo (97b)
    session/
      sessionRecord.ts                         type + SESSION_SCHEMA_VERSION
      sessionRecordSchema.ts                   Zod
      sessionStorageKey.ts                     the single key literal
      sessionShadow.ts                         the authoritative in-page belief (79, 79a)
      readSession.ts                           invariants 77, 78 - shadow first, storage after
      writeSession.ts                          invariant 79 - shadow, then persist
      clearSession.ts                          invariants 79a, 102, 104 - tombstone, then remove
    guard/
      resolveDestination.ts                    pure `from` validation (invariants 67-69, 92)
      requireSession.ts                        the authenticated-route guard (84-87)
      redirectSignedInVisitor.ts               the login-route guard (88-91)
      withSessionGuard.ts                      loader wrapper (see 5.3)
  platform/runtime/
    keyValueStorage.ts                      type KeyValueStorage (the port)
    createTabStorage.ts                     THE ONLY sessionStorage read (4)
    index.ts                                CHANGED - export both
  platform/observability/
    redact.ts                               CHANGED - path-segment rule (3)
    analyticsEvents.ts                      CHANGED - three new events (8)
    signInOutcome.ts                        const object + derived type
  app/
    composition/createRuntime.ts            CHANGED - builds tabStorage + the user store
    layout/AuthenticatedLayout.tsx          the pathless layout that renders the header
    layout/SignedInHeader.tsx               the header bar (6)
    layout/SignedInName.tsx                    internal - skeleton / name / neutral
    layout/SignedInAvatarPlaceholder.tsx       internal - the STATIC failed-name shape (6)
    routing/routeDefinitions.ts             CHANGED - takes Runtime, adds loaders (5)
    routing/routes/LoginRoute.tsx           CHANGED - a real wrapper that injects deps
    routing/routes/AuthenticatedRoute.tsx   the lazy layout module
    routing/createBackForwardRestore.ts     the `pageshow` revalidation of invariant 103
    locales/en/common.json                  CHANGED - the header's strings (8)
  shared/ui/
    Input.tsx                               CHANGED - readOnly + placeholder, additive (7)
    Button.tsx                              CHANGED - busy spinner, pressed busy fill (7)
  shared/theme/
    theme.css                               CHANGED - the invalid-field border rule
    contrastPairs.ts                        CHANGED - four new pairs
```

Deleted: `src/features/auth/AuthPlaceholderPage.tsx` and its three catalogue keys.
`src/features/hierarchy/**` is untouched (invariant 143).

#### 1.1 What `features/auth/index.ts` exports, and why that list

The public entry is the whole contract between `app` and this feature; everything else is
internal and unreachable, because `no-restricted-imports` bans `@features/*/*` and
`@features/*/**` (`eslint.config.js:127-138`).

```ts
export { LoginPage } from './LoginPage';
export type { LoginPageDependencies } from './LoginPage';
export { loadTranslations } from './loadTranslations';
export { requireSession } from './guard/requireSession';
export { redirectSignedInVisitor } from './guard/redirectSignedInVisitor';
export { withSessionGuard } from './guard/withSessionGuard';
export { clearSession } from './session/clearSession';
export { readSession } from './session/readSession';
export { createSignedInUserStore } from './data/createSignedInUserStore';
export type { SignedInUserStore } from './data/createSignedInUserStore';
export type { SignedInUserView } from './data/signedInUserView';
```

Not exported, deliberately: `deriveSecret`, the substitution table, `lookupUserIdentifier`,
`writeSession`, the record schemas, every component but `LoginPage`. The derivation and the
lookup have exactly one caller each, inside the feature; exporting them would put the
credential path on a surface `app` could reach.

`readSession` is exported although the guards already use it, because the header needs the
signed-in user id and `app` composes the header (section 6). It returns a *view* -
`{ status: 'signedIn'; userId: UserIdentifier } | { status: 'signedOut' }` - never the raw
record, so nothing outside the feature learns the record's shape or its schema version.

#### 1.2 `LoginPageDependencies`, and why navigation is one of them

`LoginPage` is inside the feature, so it cannot reach `useRuntime` (`app`-only, see Context)
and it must be handed everything it needs. The single props type carries exactly five things:

```ts
export type LoginPageDependencies = {
  http: HttpClient;
  observability: ObservabilityFacade;
  tabStorage: KeyValueStorage;
  beginInteraction: () => string;
  navigate: (destination: string, options: { replace: boolean }) => void;
};
```

`navigate` is a dependency rather than a `useNavigate()` call inside the page for a mechanical
reason, not a stylistic one: `src/app/testing/renderRoute.tsx:73-81` renders
`<ApplicationRoot runtime={runtime}>{children}</ApplicationRoot>` with **no router of any
kind** - no `RouterProvider`, no `MemoryRouter` - and `useNavigate` throws outside one. Several
checks in the test map are specified as *component* tests that reach the success path (65, 66,
130), so either `renderRoute` grows a router or the navigation is injected. Injecting it is the
smaller change and the better one: it keeps `renderRoute` a single-purpose helper, it lets a
component test assert the destination and the `replace` flag directly as a spy call rather than
inferring them from a history object, and it keeps the feature free of a router dependency it
otherwise does not need. `LoginRoute.tsx` - which is `app`, and does sit inside the router -
supplies `useNavigate()` and the three runtime fields.

`renderRoute` still gains the fake `tabStorage` and the store described in section 5.1, because
the header's component tests need them; it does **not** gain a router. Section 6 carries the
matching consequence for the header: `SignedInName` takes the loader's promise as a prop rather
than calling `useLoaderData()` itself, so its component tests can hand in a pending promise, one
resolved to a view, and one resolved to `null`, without a data router existing.

**The barrel and the entry chunk.** `routeDefinitions.ts` lives in the entry chunk and will
import the guards from this barrel, which makes the whole barrel's module graph reachable
from the entry - including, without tree-shaking, the 256-entry table. Two things settle
that rather than assume it: `package.json` gains `"sideEffects": false` (a package.json edit,
not a dependency addition, so `scripts/repository-configuration.test.ts:343-361` is
untouched), and a new build-output assertion asserts `dist/assets/entry-*.js` does **not**
contain the table's leading-values signature while `dist/assets/LoginRoute-*.js` does. If
rolldown will not shake it, the fallback is a second app-layer wrapper module that imports
the guards from a narrower entry - stated now so it is a fallback rather than a discovery.

### 2. The derivation module

`src/features/auth/domain/` is chosen for one mechanical reason beyond taste:
`vitest.config.ts:67-72` already carries a `'src/features/*/domain/**'` threshold at 100%
lines, branches, functions and statements, matching nothing today. Putting the derivation
there arms that threshold the moment the directory exists, which is what invariant 2's
"pure, framework-free, near-100%" gets to mean concretely.

**The table's form.** `substitutionTable.ts` exports
`export const SUBSTITUTION_TABLE: readonly number[] = [156, 33, 64, ...]` - a plain frozen
array literal transcribed from `docs/task.md:29-35`, not `as const` (a 256-element tuple type
costs tsc time and buys nothing) and not base64 (`atob` plus a decode loop trades ~600 raw
bytes for code that must itself be tested). Gzipped the literal is a few hundred bytes inside
a 30 kB per-route budget, so invariant 144 is not in play; the budget question is whether it
lands in the ROUTE chunk rather than the entry, which section 1.1 settles.

The identifiers `POISON_ARRAY` and `make32` are banned anywhere under `src`
(`scripts/assert-domain-vocabulary.mjs:29-34`) and stay banned - the ban exists so the brief's
names are not copied verbatim, and `SUBSTITUTION_TABLE` / `normalizeToCodeUnits` are the
replacements. No allow-list entry is needed for either.

**Invariant 5's "asserted against a recorded fixed value", without restating the literal.**
Two independent checks, in `substitutionTable.test.ts`, and the second exists because the
first has a failure mode:

1. **A separately-derived fixture.** The test reads `docs/task.md` with `node:fs`, extracts
   the text between `const POISON_ARRAY = [` and the closing `];` with one regex, parses it
   as a comma-separated integer list, and asserts `SUBSTITUTION_TABLE` deep-equals it. The
   expectation is derived from the brief's own committed text, not from the module under
   test, so this catches a transcription error in either direction. Test files are excluded
   from the vocabulary scan (`scripts/assert-domain-vocabulary.mjs:115-117, 140-142`), so the
   test may name `POISON_ARRAY` freely.
2. **A recorded checksum.** `substitutionTableChecksum.ts` exports a pure 32-bit FNV-1a over
   a `readonly number[]`, and the test asserts the table's checksum equals a hex constant
   written into the test. FNV-1a rather than SHA-256 because `crypto.subtle` is async and
   `crypto.getRandomValues` is already lint-restricted; a fifteen-line pure function needs no
   dependency (invariant 134) and is itself covered by the 100% domain threshold.

Check 2 closes check 1's hole: an edit that changes both the module and `docs/task.md`
consistently passes check 1 and fails check 2. Neither check establishes that the table was
*originally* right - only invariant 6/6a's live proof against a real account can, and section
9 says so rather than letting the checksum imply more than it proves.

**The derivation itself.**

```ts
// normalizeToCodeUnits.ts - invariant 3
export function normalizeToCodeUnits(input: string): readonly number[]
// deriveSecret.ts - invariants 1, 2, 4, 7-11
export function deriveSecret(email: string, password: string): DerivedSecret
```

`normalizeToCodeUnits` is a **byte-exact transcription of the brief's `make32`**
(`docs/task.md:37-45`) under a name the vocabulary scanner permits. It repeats the input end to
end until the accumulated string is at least 32 UTF-16 code units long, keeps the first 32 code
units with `substring(0, 32)`, and then iterates that string the way the brief does -
`Array.from(resultString, (char) => char.charCodeAt(0))`, which iterates by **code point**.

That last step is the whole of invariant 7 and it is what the return type has to admit:

- For an all-BMP input, iteration yields 32 elements and the array has exactly 32 entries.
- For an input where an astral character survives the truncation, that character is **one**
  element whose `charCodeAt(0)` is its **high surrogate**; the low surrogate is dropped. The
  array is therefore **shorter than 32**, by one entry per surviving astral character.
- If the truncation splits a surrogate pair, the lone surrogate is still one element and still
  contributes its own code unit.

So the signature is `(input: string) => readonly number[]` with the array length documented as
"32 or fewer", not "exactly 32", and there is no padding, no fallback and no repair. Anything
that made it always-32 would be a different algorithm producing different secrets, which is the
one thing this module may not do. It throws a `RangeError` on an empty string rather than
looping forever (invariant 11); `deriveSecret` checks both inputs before either call, so the
throw is unreachable from the form (invariant 34's gate) and is proven only by a direct unit
test.

`deriveSecret` trims the email **before** calling `normalizeToCodeUnits` and does nothing else
to it (invariant 9), passes the password through untouched (invariant 10), then for each of the
32 positions computes `(emailUnits[i] ^ passwordUnits[i]) & 0xff`, indexes
`SUBSTITUTION_TABLE`, and renders the entry as two uppercase hex digits. Two things about that
loop are deliberate transcriptions rather than accidents:

- The loop runs `i` from 0 to 31 regardless of either array's length, exactly as
  `docs/task.md:51` does. When an array is short, `emailUnits[i]` is `undefined`, and
  `undefined ^ x` evaluates to `x` because `ToInt32(NaN)` is `0`. TypeScript will type the
  element access as `number` under the project's settings, so the module reads the element into
  a `number | undefined` and applies the XOR through a `?? 0`-free expression that reproduces
  the JavaScript coercion literally, with a comment naming invariant 7 and `docs/task.md:51-52`
  so a later reader does not "tidy" it into a length guard.
- The `& 0xff` is the brief's expression verbatim (`docs/task.md:52`) and is what makes a BMP
  code unit above 255 contribute its low byte.

Rendering reuses `bytesToHex` from `@shared/utils` (`src/shared/utils/bytesToHex.ts:1-5`, which
pads to two lowercase hex digits) over a `Uint8Array` of the 32 table entries, then uppercases -
`feature -> shared-utils` is an allowed edge (`eslint.config.js:347-356`) and this keeps one hex
renderer in the repository rather than two. The output is 64 characters in every case, including
the short-array one, because the loop always produces 32 table entries.

**The trim is the one place this module departs from the brief, and it is recorded as a
deviation rather than presented as part of the transcription.** `docs/task.md:47-49` passes
`email` straight into `make32`. Trimming changes the derived bytes for any stored address with
boundary whitespace, and the live proof of invariant 6a is unlikely to discriminate it (the
account it picks almost certainly has a clean address). It is kept for the reason invariant 9
gives, it happens strictly outside `normalizeToCodeUnits`, and it appears in the decision-log
list at the end of this document so ARCHITECTURE.md carries it.

`DerivedSecret` is a branded string (`type DerivedSecret = string & { readonly brand: unique symbol }`)
so a raw string cannot be passed where a secret is expected, matching ARCHITECTURE.md's
branded-id decision. Invariant 12 is a code-shape obligation with an honest boundary: the
trimmed email and the password exist as `deriveSecret`'s parameters and as the two controlled
inputs' state, which is where a controlled input necessarily keeps them, and nothing copies
either into the result union, a telemetry payload, a rendered string or storage. The result
union (section 7) is structurally incapable of holding either - that is the `@ts-expect-error`
half of the check - and the substring assertions of invariants 125 and 129 are the observable
half.

### 3. The lookup, and scrubbing the secret out of telemetry

**Entry point and path.** `lookupUserIdentifier` calls `runtime.http.request(...)` - the same
`HttpClient.request` every other caller uses (`src/platform/http/createHttpClient.ts:32-34`) -
with `method: 'GET'`, `resourcePath: secretResourcePath(secret)`, `signal`, and a `parse`
built from Zod. No `searchParameters`, no `body`, no custom header: invariant 15 is satisfied
by what the request object does not carry, and `buildUrl`
(`src/platform/http/buildUrl.ts:3-14`) adds nothing when `searchParameters` is absent.

```ts
// secretResourcePath.ts
export function secretResourcePath(secret: DerivedSecret): ResourcePath {
  return `/secrets/${secret}.json`;
}
```

The template type `` `/${string}` `` (`src/platform/http/resourcePath.ts:1`) accepts it, and
the origin check at `createHttpClient.ts:63-69` will pass because the secret is 64 characters
of `[0-9A-F]` by invariant 1 - no path-escape shape is reachable.

This module is the only file under `src` that will contain the literal `/secrets`, and
narrowing the ban that forbids it needs a **new mechanism, not an entry in an existing map**.
The obvious-looking move does not work: `FILE_ALLOWLIST`
(`scripts/assert-domain-vocabulary.mjs:44-48`) maps a file path to a set of banned *words* and
is read only inside `checkExportedVocabulary` (lines 113-135, at line 119). The `/secrets` check
is an unconditional literal-substring test inside a **different** function,
`checkWholeScopeVocabulary` (lines 138-161, the test at 159-161), which never consults
`FILE_ALLOWLIST` at all - so an entry there would leave the proposed file failing lint with no
indication why. The change is therefore: `checkWholeScopeVocabulary` gains its own
path-keyed allow-list, keyed the same way and named distinctly
(`WHOLE_SCOPE_FILE_ALLOWLIST`), carrying the literal `/secrets` for
`src/features/auth/data/secretResourcePath.ts` and nothing else, consulted only by the literal
test and not by the identifier scan above it. `scripts/guard-scripts.test.ts` is extended to
assert both directions: the ban still fires for a second file containing the literal, and the
allow-listed file passes. That is one small function change rather than a data edit, and it is
called out here because the cheaper-sounding version is what a reader would otherwise attempt
first.

**Narrowing the response (invariants 16-18a).** `lookupResultSchema.ts` is a Zod union:

```ts
const USER_IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]+$/;

z.union([
  z.null(),
  z.string().check(z.regex(USER_IDENTIFIER_PATTERN)),  // implies non-empty
  z.int().check(z.finite()),                           // rejects fractional and non-finite
])
```

Everything else - an object, an array, an empty string, a boolean, a fractional or infinite
number - fails the parse, and so does **any string carrying a character outside the pattern**.

**Why the pattern, and why here (invariant 18a).** The id is interpolated into a request path
by `userResourcePath` and written into the session record, and neither the `` `/${string}` ``
template type nor `new URL()` will object to a value that changes which resource is addressed.
`/users/../secrets.json` resolves to `/secrets.json` - same origin, so `createHttpClient`'s
origin check (lines 63-69) passes it - and `/`, `?`, `#` and a backslash each redirect the
request somewhere the caller did not ask for. The parse boundary is the right place because it
is the only place that runs **before** the value is used or stored: an id that never becomes a
`UserIdentifier` cannot reach a path, a record or a component. A rejected value takes the
existing `parse`-throw route to `{ kind: 'parse' }` and therefore to the service-problem state
(invariant 18), which is the correct classification - a malformed response is not evidence that
a credential is wrong.

`sessionRecordSchema` reuses the same pattern, so a hand-edited or downgraded storage record
carrying a hostile id is unreadable in invariant 77's sense rather than a live identifier.

`userResourcePath` percent-encodes regardless:

```ts
// userResourcePath.ts
export function userResourcePath(userId: UserIdentifier): ResourcePath {
  return `/users/${encodeURIComponent(String(userId))}.json`;
}
```

Belt and braces on purpose. The charset check is the guarantee; the encoding is what keeps the
guarantee from depending on the check having been applied on every path into this function, and
`encodeURIComponent` is already on the vocabulary scanner's allowed-identifier list
(`scripts/assert-domain-vocabulary.mjs:36-42`). `secretResourcePath` needs no encoding for the
same reason it needs no check - invariant 1 fixes the secret's alphabet - but it is written the
same way so the two paths do not diverge in shape. `parse` throwing is mapped by the client to
`{ kind: 'parse' }` (`src/platform/http/performAttempt.ts:57-63`), which is a `failure`
outcome, so invariant 18 falls out of the existing mapping without a special case: a
malformed body reaches the service-problem state by the same route a 500 does, and never the
no-match state. `null` parses successfully, so invariant 16's "normal outcome" is a `success`
result whose value is `null` - not retried, not an error, exactly as the invariant requires.
The caller then maps `HttpResult<LookupResult>` to a small internal union:

```ts
type LookupOutcome =
  | { kind: 'signedIn'; userId: UserIdentifier }
  | { kind: 'noMatch' }
  | { kind: 'serviceProblem'; correlationId: string }
  | { kind: 'cancelled' };
```

`cancelled` is its own arm so invariants 22, 47 and 124 are one branch that emits nothing,
rather than a boolean threaded through the failure path.

**Invariant 125 needs a change, and here is the one.** As section 1's Context establishes,
`redact` (`src/platform/observability/redact.ts:32, 43-59`) scrubs matching object KEYS and
matching URL SEARCH PARAMETERS, and does nothing to `resourcePath: '/secrets/<SECRET>.json'`.
`redact.ts` gains a third rule, applied to every string value alongside the existing URL
rewrite: **a path segment immediately following a segment that matches the redaction pattern
is replaced with `[redacted]`**, with any `.json` (or other) extension preserved. So
`/secrets/ABC…F.json` becomes `/secrets/[redacted].json`. The rule is generic and
domain-free - it names no backend and no route - and it is fail-CLOSED: every present and
future caller of the http client gets it without remembering anything.

Why here rather than at the call site: the alternative is a `telemetryResourcePath` field on
`HttpRequest`, which changes the http client's public surface (invariant 141 forbids that
without raising it) and fails OPEN - a caller who forgets leaks the secret with everything
still green. `redact` is not part of the observability facade and is not exported from
`src/platform/observability/index.ts:1-14`; it is an internal of `createObservability`
(`createObservability.ts:40`). It is still a change to a platform module, so it is raised
here and recorded in ARCHITECTURE.md's decision log in the same change, alongside invariant
132's amendment to the "secrets never enter URLs" wording.
`scripts/assert-domain-vocabulary.mjs:44-48` already allow-lists the word `secret` in
`redact.ts`, so no guard-script edit is needed for it.

The three places the secret would otherwise appear are then all covered by one rule: the
per-attempt timing record (`createHttpClient.ts:142-151`), the cancellation debug record
(lines 105-108), and the invalid-path error record (lines 65-67).

**The header's one-record fetch (invariants 97, 97a).** `fetchSignedInUser` issues
`GET /users/${id}.json` through the same client, with `signedInUserSchema` doing the work
invariant 97a describes: the schema is a `z.object({...})` listing only the identifying
fields and the name parts and nothing else, so Zod's default object behaviour strips
`password` at the parse boundary and it never exists as a value in application memory. The
schema is written with `.loose()` deliberately NOT used. The parsed result is mapped to
`SignedInUserView` (`{ displayName: string }` plus whatever the name parts compose into),
which is the only shape that crosses back out - so even a future schema change cannot widen
what the header holds.

### 4. Session storage access

**The port.** `platform/runtime/keyValueStorage.ts` declares
`type KeyValueStorage = { read(key: string): string | null; write(key: string, value: string): boolean; remove(key: string): void }`.
`write` returns a boolean rather than throwing, because invariant 79 wants a persist failure
to be an outcome the caller handles, not an exception.

**The single reader.** `platform/runtime/createTabStorage.ts` is the one module in the
repository that touches `sessionStorage`. It wraps the property access itself in `try/catch`,
not only the calls: a browser with storage denied throws on `window.sessionStorage` access,
before any method is called, which is precisely the case invariant 78 names. When access
throws, the factory returns a null-object storage whose `read` always returns `null` and
whose `write` always returns `false` - so "no session" and "persist failed" are the honest
answers rather than an exception reaching application code.

`platform` is the right layer (it "adapts the outside world") and the module is domain-free:
it knows about a key-value store, not a session. The name matters mechanically -
`scripts/assert-domain-vocabulary.mjs:16-26` bans the exported word `session` anywhere under
`src/platform/**`, so `createSessionStorage` would fail lint. `createTabStorage` and
`KeyValueStorage` segment cleanly. The lint override is one file:
`eslint.config.js` gains a block for `src/platform/runtime/createTabStorage.ts` that
re-enables only `sessionStorage` (bare and member forms) and keeps `localStorage`,
`indexedDB`, `caches` and `serviceWorker` banned - the same shape as the `createFetchTransport`
override at `eslint.config.js:667-683`, which filters one identifier out of the list rather
than turning the rule off. `scripts/eslint-configuration.test.ts:52-95` is updated to assert
exactly that: five globals banned everywhere, with `sessionStorage` permitted in exactly one
file. This is strictly narrower than phase 1's TECH.md's predicted "phase 2 removes the
`sessionStorage` entries", and it is why invariant 75's "narrowed to that one record rather
than opened generally" is mechanically true.

**The record and its reads (invariants 72, 77, 78).**

```ts
// sessionRecord.ts
export const SESSION_SCHEMA_VERSION = 1;
export type SessionRecord = { version: number; userId: UserIdentifier };
```

Two fields, nothing else (invariant 72). `readSession(storage, observability)` returns
`{ status: 'signedIn'; userId } | { status: 'signedOut' }` and never throws. Its paths are one
function with one `safeParse`, consulted **after** the shadow below:

- key absent -> signed out, silent.
- value present but `JSON.parse` throws, or `safeParse` fails (missing `userId`, wrong type,
  or a `userId` outside section 3's charset), or `version !== SESSION_SCHEMA_VERSION` -> remove
  the key, report `observability.logger.warn('auth.session_unreadable', { reason })` where
  `reason` is one of three literals and carries no stored bytes, return signed out
  (invariant 77).
- storage itself unavailable -> `createTabStorage`'s null object already returned `null`, so
  this collapses into "key absent" with no extra branch (invariant 78).

The three reason literals rather than the offending value is what keeps invariant 125 true
for this path too.

**The in-memory shadow is authoritative, not a fallback (invariants 79, 79a).** This is the
part that has to be got the right way round. The shadow holds a three-state value per storage
instance - **unset**, `{ record }`, or **cleared** (a tombstone) - and `readSession` consults it
**first**:

- shadow `{ record }` -> that record decides, storage is not read.
- shadow cleared -> signed out, storage is not read.
- shadow unset -> read storage, parse it, and take the paths above.

`writeSession(storage, record)` sets the shadow to `{ record }` and *then* attempts to persist;
`clearSession(storage)` sets the shadow to cleared and *then* attempts to remove. Both report at
warn level when the storage half fails.

A storage-first read with a shadow fallback - the obvious arrangement, and the wrong one -
fails in exactly the two cases the shadow exists for, because in both of them storage is
**stale rather than empty**:

- A failed write over an older but still valid record signs the visitor in as the **previous
  user**. That is a wrong-identity bug, not a degraded experience, and it is the more likely of
  the two because a quota or a denied-storage condition does not clear what is already there.
- A failed removal on sign-out leaves the old record readable, so the next guard run redirects
  the just-signed-out visitor back inside.

Shadow-first is correct in both, and it costs nothing anywhere else: on a fresh page load the
shadow is unset by construction, so invariant 80's reload path reads storage exactly as before.
Invariant 79's honest consequence is unchanged - after a reload, whatever storage actually holds
is what the visitor gets.

The shadow is a `WeakMap<KeyValueStorage, SessionShadow>` at module scope - the same
instance-keyed trick `src/features/auth/loadTranslations.ts:10` already uses for its
registration promises - which makes it per-runtime, so every test that builds its own runtime is
isolated by construction and no test needs a reset hook. `clearSession` writing a tombstone
rather than deleting the map entry is what makes invariant 102 hold when `remove` fails, and
invariant 104 is trivially idempotent either way.

**Determinism in tests.** Every session function takes the storage as its first parameter, so
unit tests pass a hand-written fake (`{ read, write, remove }` over a `Map`, plus variants
that throw or return `false`) with no jsdom storage involved. The e2e half reads the real
`sessionStorage` through `page.evaluate`, which is what invariant 76's "asserted, not
eyeballed" needs and what no unit test can give.

### 5. The guard and the router

#### 5.1 How a loader reaches its dependencies

`createApplicationRouter(runtime)` already has the runtime in hand when it builds the route
table (`src/app/routing/createApplicationRouter.ts:9-14`). The change is one signature:
`routeDefinitions(instance: i18n, developmentRoutes: boolean)` becomes
`routeDefinitions(runtime: Runtime)`, and every loader is a closure over that `runtime`. No
module-level singleton, no global, no context: loaders run outside React and this is the one
composition point where the runtime is available synchronously to non-React code.
`createRuntime.ts` gains two fields - `tabStorage: KeyValueStorage` from `createTabStorage()`,
and `signedInUserStore: SignedInUserStore` from `createSignedInUserStore({ http, observability })`
- both built once per page, which is what invariant 97b's "once per page lifetime" means
concretely.

**Both fields land in M1, not in the milestone that first reads them.** The login page needs
`tabStorage` to write a session, and it needs it in M2, before any loader exists; the header
needs the store in M4. Splitting the two fields across milestones would mean editing
`createRuntime`'s frozen record three times and would make M2's claimed sign-in e2e
unverifiable, since `writeSession` is deliberately off the barrel (section 1.1) and `app` has
no other way to reach a storage instance. One change, in M1, adding both fields; the store is
constructed there and simply has no reader until M4. See the milestone split.

`src/app/testing/renderRoute.tsx:35-71` builds the same runtime with fakes; it gains a fake
`tabStorage` (a `Map`-backed `{ read, write, remove }`) and a store built over its fake
transport, in the same M1 change, so a component test drives the whole path without touching
jsdom's storage or the network. It does **not** gain a router - see section 1.2 for why
navigation is injected instead.

#### 5.2 The route table

```
{ path: '/', element: <ApplicationLayout/>, ErrorBoundary: RouteErrorBoundary,
  HydrateFallback: () => null, children: [
    { id: 'authenticated',
      lazy: -> { loader: authenticatedLoader, Component: AuthenticatedLayout },
      children: [ { index: true, lazy: -> HomeRoute } ] },
    { path: 'login',  loader: loginLoader, lazy: -> LoginRoute },
    { path: '__kit',  ... },                       // dev-only, unchanged, unguarded
    { path: '*',      lazy: -> NotFoundRoute },    // unguarded (invariant 90)
  ] }
```

The authenticated layout is a **pathless** route, so the route set stays `/`, `/login` and
the wildcard (invariant 136). The wildcard sits outside it, so not-found is unguarded for
both session states (invariants 90, 137). Ordering is unchanged in the one way that matters:
the dev-only `/__kit` entry is still pushed before the wildcard
(`src/app/routing/routeDefinitions.ts:44-60`), because the wildcard would otherwise match it.

`loginLoader` cannot be lazy - it must run before the login chunk is fetched, or a signed-in
visitor would pay for a chunk they never see - so it is an eager closure in
`routeDefinitions.ts` calling `redirectSignedInVisitor`. `authenticatedLoader` is supplied by
the lazy module together with `AuthenticatedLayout`, which react-router 8 supports (a `lazy()`
may return `loader` alongside `Component`); this keeps the header, its schema and its store
wiring out of the entry chunk.

`authenticatedLoader` returns **an object holding the header's promise, never the promise
itself**:

```ts
// AuthenticatedRoute.tsx
export function authenticatedLoader({ request }: LoaderFunctionArgs) {
  const { userId } = requireSession({ request, tabStorage, observability });
  return { signedInUser: runtime.signedInUserStore.read(userId) };  // NOT awaited, NOT returned bare
}
```

The distinction is load-bearing and is easy to get wrong. React Router resolves a loader as
`{ type: "data", result: await actualHandler() }` (`router.js:2441-2446`), so a bare promise is
awaited before the route renders: the navigation blocks until the user record arrives, no
Suspense fallback is ever shown, invariant 99's skeleton never appears and invariant 100's "the
header never blocks the page beneath it" is violated in the strongest possible way - the page
does not render at all. Wrapping the promise in a synchronously returned object is what lets it
reach `SignedInName` unresolved, where `use()` suspends against it (section 6).

#### 5.3 The guards

```ts
// requireSession.ts - invariants 84-87
export function requireSession(
  { request, tabStorage, observability }: GuardContext,
): { userId: UserIdentifier }   // throws a Response on the redirect path

// redirectSignedInVisitor.ts - invariants 88-91
export function redirectSignedInVisitor({ request, tabStorage, observability }: GuardContext): null
```

`requireSession` reads the session; when signed out it builds `` `${url.pathname}${url.search}` ``
from `request.url` (with `basename` stripped - `basePath` is `/` in every mode, so this is a
no-op today and correct if that ever changes), and throws a redirect to
`'/login?from=' + encodeURIComponent(from)`.

**No hash.** `request.url` carries none: react-router builds it through `stripHashFromPath`
(`router.js:2604-2605, 2762-2767`), so `new URL(request.url).hash` is unconditionally `''`.
Writing `${url.hash}` there would read as working and silently append nothing, which is worse
than not writing it. `window.location.hash` is **not** substituted, because during a
client-side push navigation the browser's location is still the referring page and its hash
would be the wrong one; carrying a wrong fragment forward is worse than carrying none.
Invariant 84 states the limitation.

**The redirect is `replace()` or `redirect()` depending on the navigation, not `replace()`
always.** As Context establishes, `replace()` sets `X-Remix-Replace`, which `router.js:1024`
promotes to a `REPLACE` history action - and react-router does not touch history until the
navigation's redirects are processed (`router.js:981-999`). So:

- when the guarded URL is **already the current history entry** (initial document load, a
  reload, a POP), a PUSH would leave that entry behind and Back from the login card would
  re-enter the guard - `replace()` is required;
- when the guarded URL is the target of an **in-app push** (a `Link` click, a programmatic
  navigate), no entry for it exists yet, so a plain `redirect()` puts the login card in the
  entry the guarded URL would have taken and Back returns to the referring page - while
  `replace()` would overwrite the **referring page's** entry instead, and Back would land on
  whatever preceded it. That is the direct negation of invariant 87.

The guard discriminates the two by comparing the guarded location against the browser's current
location, which is exactly the comparison the block comment makes valid:

```ts
const guardedLocation = `${url.pathname}${url.search}`;
const isCurrentEntry =
  `${window.location.pathname}${window.location.search}` === guardedLocation;
throw isCurrentEntry ? replace(destination) : redirect(destination);
```

`window` is available because guards run in the browser only (this app has no SSR), and the
comparison is on the same basename-stripped shape the `from` value uses. Both branches are
covered by the invariant-87 e2e, which now runs the link-click variant as well as the direct
one - see the test map.

`redirectSignedInVisitor` faces the same choice and resolves it the same way, for the same
reason.

**The import ban is narrowed in both blocks.** `eslint.config.js:549-571` and
`eslint.config.js:572-593` carry the identical `redirect`/`redirectDocument` ban, and the second
one - scoped to `src/features/*/**/*.{ts,tsx}` - is the effective configuration for
`src/features/auth/guard/**`, because flat config replaces rather than merges a rule's options
across matching blocks. Narrowing only the first would leave every guard file failing lint. Both
blocks keep `redirectDocument` banned (a full document load is never right here) and both permit
`redirect` inside `src/features/auth/guard/**` only, expressed as a third block scoped to that
directory that re-states the rule with `redirectDocument` alone. That third block must also
**repeat `patterns: [SINKS_IMPORT_PATTERN]`**, which the feature-scoped block at
`eslint.config.js:589` carries: by the same replaces-rather-than-merges rule that makes the
third block necessary, a block stating only `paths` silently drops the sinks ban for exactly the
directory that handles the credential path. This is the narrowing-that-does-not-narrow failure
mode Risks warns about, applied to the narrowing itself, so `scripts/eslint-configuration.test.ts`
asserts the sinks pattern is present in all three blocks rather than only in the two it started in. `replace` is on neither ban
list and needs no permission. The stale message text - "No loader, guard or redirect exists in
this phase (invariant 97)", whose invariant number belongs to phase 1's numbering - is rewritten
in both blocks, and `scripts/eslint-configuration.test.ts:255-264`'s probe moves to the new
message.

`redirectSignedInVisitor` throws a redirect to `resolveDestination(new URL(request.url).searchParams.get('from'))`
- `replace()` or `redirect()` by the same current-entry test - when a session exists, and
returns `null` otherwise, so invariant 91 is the default path and
invariant 88's "before the form renders" is structural - the loader settles before the route
component is ever constructed.

```ts
// resolveDestination.ts - invariants 67-69, 92
export function resolveDestination(from: string | null): string
```

Pure. A candidate is usable only when it begins with exactly one `/`, its second character is
neither `/` nor `\`, and `new URL(candidate, PLACEHOLDER_ORIGIN).origin === PLACEHOLDER_ORIGIN`.
The third clause is not belt-and-braces: `createHttpClient.ts:53-62` records empirically that
the WHATWG parser resolves `/\evil.example/x` to another origin, which no prefix heuristic
catches, and the same escape would turn this form into an open redirect (invariant 68). One
further clause exists solely for invariant 93: a resolved destination whose pathname is the
login path falls back to `/`, because otherwise `from=/login` would make
`redirectSignedInVisitor` redirect to a route whose loader redirects again. Everything
unusable resolves to `/`. A `from` that survives is treated as an opaque path and is never
inspected for content (invariant 92); invariant 69 falls out for free, because an unknown but
same-origin path lands on the wildcard.

**Invariant 85 and react-router's parallel loaders.** React Router runs every matched route's
loader in parallel and short-circuits on the first redirect - so a guard on a PARENT route
does not stop a CHILD's loader from having already started. In phase 2 the hierarchy route
has no loader, so the invariant's e2e assertion (no users request from an unauthenticated
visit) passes; in phase 3 it would silently break. `withSessionGuard(loader)` is exported for
that reason: it wraps a child loader so the guard runs as its first statement, and a unit
test asserts that every route object beneath the authenticated layout either has no loader or
has one produced by `withSessionGuard`. Phase 2 wraps nothing.

This is built now, deliberately, and invariant 146 carries it as its one named exception rather
than being contradicted by it - the user approved it on the grounds above. The reasoning is
worth restating in the invariant's own terms: the exception is justified by **invariant 85 in
this phase**, not by phase 3's convenience. Invariant 85 is currently true by accident (the
guarded route happens to have no loader), and an invariant that is true by accident is one
line of unrelated work away from being false with a green suite. The wrapper plus its
structural test converts the accident into an enforced property. It appears in the decision-log
list at the end of this document so ARCHITECTURE.md carries both the exception and its reason.

**Invariants 66, 70.** The success path writes the session synchronously and then calls the
injected `navigate(destination, { replace: true })` (section 1.2), so the record is readable
before the destination's loader runs (invariant 66) and the login page's history entry is
replaced (invariant 70). `replace: true` is unconditional here, unlike the guard's choice: the
login card *is* the current entry when its own form succeeds, so this is the case where
replacing is always right.

**Invariant 86, and what actually establishes it.** Two things do, and they are different in
kind:

- *Structural, and this is the real guarantee:* react-router does not render a route until its
  loaders settle, the guard throws its redirect from the loader, and
  `HydrateFallback: () => null` (`routeDefinitions.ts:75`) covers the initial chunk fetch with
  nothing rather than with borrowed markup. There is no moment at which an authenticated
  component is constructed.
- *Mechanical, and it is a detector rather than a proof:* a `MutationObserver` installed through
  `page.addInitScript` **before** any navigation records every element added to the document for
  the life of the page. If a guarded route's content were ever inserted, even for one frame and
  even if removed immediately, the observer's log holds it. A `domcontentloaded` snapshot plus a
  later zero-count assertion - the check this spec originally proposed - cannot decide this at
  all: both sample discrete moments, and a paint between them is invisible to both.

The observer catches insertion, not painting. A composited frame with no DOM change is outside
what any in-page instrument can see, so invariant 86 sits in the partially-review-dependent list
with the structural argument named as the covered half.

**Invariant 127.** `createInteractionTracker` emits `app.route_viewed` only in `settle()`,
which runs when navigation returns to idle and skips when `state.errors` is non-empty
(`src/app/routing/createInteractionTracker.ts:38-46, 50-59`). A loader redirect never returns
the router to idle between the two navigations, so the refused route emits nothing. That is a
claim about a library's state machine, so it is asserted (e2e: exactly one `app.route_viewed`,
naming the login route, after a guarded request) rather than argued.

**Invariant 103 and the back-forward cache.** A same-document Back after sign-out re-runs the
loaders and lands on the login page. A bfcache restore does not: the JS heap comes back with
the authenticated view already rendered and no loader re-run.
`app/routing/createBackForwardRestore.ts` attaches a `pageshow` listener that calls
`router.revalidate()` when `event.persisted` is true, wired in `bootstrap.ts` beside
`runtime.interactionTracker.attach(router)` (`src/app/bootstrap.ts:51`). Revalidation re-runs
the guard, which redirects.

What that does and does not buy, stated rather than implied: revalidation necessarily runs
**after** the browser has handed the restored document back, so a restored frame of
authenticated content can be on screen for the interval between restore and redirect. No
client-side mechanism closes that interval - `pageshow` is the earliest hook there is - so
invariant 103 is worded as "does not leave the visitor on an authenticated view" rather than
"never renders one", and the residue is named in the review-dependent list. The listener itself
is unit-tested (a synthetic `pageshow` with `persisted: true` calls `revalidate`); the browser
behaviour is not reproducible in this suite (see Risks).

**Invariant 48a and the restored login page.** The same restore path reaches the login card, and
there the failure mode is a frozen submitting state: `useLoginSubmission`'s abort runs from a
`useEffect` cleanup, and a bfcache freeze does not unmount anything, so a restored card could
show a spinner for a request that will never settle. `useLoginSubmission` therefore registers
its own `pageshow` listener: when `event.persisted` is true it aborts any controller it still
holds and resets the result to `{ outcome: 'untouched' }`. The field values are left alone -
they are the visitor's typing and there is no reason to discard them (invariant 48a). This is
component-testable without a browser, by dispatching a synthetic `pageshow`, which is what the
test map asserts.

### 6. The header

**Layer.** The header renders on an authenticated route, needs the auth session, and must not
create a cross-feature import. It is owned by `app`: `app/layout/SignedInHeader.tsx` composes
kit components and `common` strings, and reads its data from `features/auth` through the
public entry. `features/hierarchy` never learns the header exists (invariant 143's body is
untouched), and `features/auth` never imports `features/hierarchy`. `app -> feature` is an
allowed edge (`eslint.config.js:328-346`).

**The one-record fetch and its hold (invariants 97, 97a-97d).** `createSignedInUserStore({ http, observability })`
returns `{ read(userId): Promise<SignedInUserView | null> }`, memoising the promise by user id
for the store's lifetime. The store is built once in `createRuntime.ts`, so its lifetime is
the page's - which is exactly invariant 97b, and it means a reload re-requests (the honest
consequence the invariant names). `authenticatedLoader` calls `store.read(userId)` and returns
it **inside an object** - `{ signedInUser: store.read(userId) }`, never the bare promise, for
the reason section 5.2 gives: react-router awaits a loader's return value
(`router.js:2441-2446`), so a bare promise makes the loader blocking and deletes the skeleton
this design exists to produce. `AuthenticatedLayout` - which is `app`, and does sit inside the
router - reads `useLoaderData().signedInUser` and passes that promise **as a prop** to
`SignedInHeader`, which passes it to `SignedInName`; `SignedInName` resolves it with `use()`
inside a `<Suspense fallback={<SignedInNameSkeleton/>}>`.

The promise is a prop rather than a `useLoaderData()` call inside `SignedInName` for the same
mechanical reason `navigate` is a dependency in section 1.2: `useLoaderData` throws outside a
data router, `renderRoute.tsx:73-81` renders `<ApplicationRoot>` with no router of any kind,
and invariants 97c, 98, 99 and 100 are all mapped as **component** tests that run through it.
Taking the promise as a prop lets a component test hand in the promise directly, in each of the
only two settled shapes it has - resolved to a `SignedInUserView`, or resolved to `null` - plus a
pending one for the skeleton, without `renderRoute` growing a memory data router that every other
component test would then pay for. A **rejected** promise is deliberately not among the cases: the
paragraph below is why the store's promise never rejects, so 97c's five failure arms are exercised
by driving `fetchSignedInUser` through each `HttpResult` arm and asserting it resolves to `null`,
not by rejecting the promise the header reads. A component test that handed `SignedInName` a
rejected promise would be testing a state the system cannot produce.
The `app` layer keeps the one `useLoaderData` call, in the one component that is inside the
router by construction. This is ARCHITECTURE.md's own "loader
starts the fetch, `use()` suspends" decision applied unchanged, and it buys three invariants at
once: the skeleton of invariant 99 is the Suspense fallback, the page beneath never blocks
(invariant 100) because the loader does not await, and no waterfall is introduced.

Invariant 97c is why the store's promise **never rejects**: every failure arm of
`HttpResult` - network, timeout, http, parse, cancelled - and a `null` body are all mapped
inside `fetchSignedInUser` to a resolved `null`, with one
`observability.logger.warn('auth.signed_in_user_unresolved', { correlationId, reason })`. A
rejected promise read by `use()` would reach `RouteErrorBoundary` and produce exactly the
error page invariant 97c forbids, so the mapping is load-bearing rather than defensive.

**The three presentations (invariant 99).** `SignedInName` renders one of three, all of the
same reserved box: a `Skeleton` while the promise is pending, the resolved `displayName`, or -
when the value is `null` - a neutral catalogue string that identifies the session without
naming the user.

The avatar mirrors it, and the failed case is deliberately **not** the same element as the
pending case:

- **resolved** - `Avatar` with `displayName` (`src/shared/ui/Avatar.tsx:45-52` derives
  initials);
- **pending** - `Skeleton shape="circle"` sized `SkeletonSize.avatar`, which is correct here
  because the state genuinely is loading;
- **failed** - `SignedInAvatarPlaceholder`, an app-owned `<span>` carrying
  `sizeClass[SkeletonSize.avatar]`, the rounded-full and surface classes, and **no**
  `animate-pulse`.

The third one exists because `Skeleton` hard-codes `animate-pulse` and `aria-hidden="true"`
(`src/shared/ui/Skeleton.tsx:38, 39`). Reusing it for a terminal state would render a circle
that pulses forever - a loading indicator for a load that has finished and will not be retried -
and would remove the only avatar-position element from the accessibility tree in a settled
state. Invariant 99 asks for a *placeholder shape*, not a loading indicator, and the two are
different claims about the world.

It is app markup rather than a fourth kit change on purpose: `sizeClass` and `SkeletonSize` are
both exported from the kit entry (`src/shared/ui/index.ts:12-13`), so the reserved box is
literally the same class string `Avatar` and `Skeleton` use (`h-[34px] w-[34px]`,
`src/shared/ui/sizeClass.ts`, `src/shared/ui/Avatar.tsx:11-14`) and no reflow is possible;
adding an `animated?: boolean` to `Skeleton` would open a fourth kit surface under invariant 141
to save four lines of markup. The name position adds `aria-busy="true"` on its container while
pending, so assistive technology hears "busy" rather than the placeholder's shape, and drops it
in both settled presentations. Neither the neutral presentation nor the skeleton is an alert or
an error state.

**The logout affordance (invariants 98, 101, 102).** A kit `Button variant="secondary"`
rendered unconditionally - outside the Suspense boundary, so it exists and is operable before
any name is known and if none ever arrives. Its handler calls
`clearSession(runtime.tabStorage)`, tracks `auth.signed_out`, and calls
`navigate('/login', { replace: true })`. `Button` is a real `<button>` with Enter and Space
handled natively and the global `:focus-visible` ring (`src/shared/theme/theme.css:92-95`), so
invariant 101 needs no bespoke work. There is no confirmation prompt.

### 7. Form state

**Submission.** `useLoginSubmission` wraps React 19's `useActionState`, which ARCHITECTURE.md's
runtime-flow diagram already names. `<form action={formAction}>` - a React 19 form action -
calls `preventDefault()` on the submit event itself, so the form can never navigate as a GET
(invariant 130) and no `onSubmit` handler is needed to guarantee it. `isPending` from the hook
is the submitting signal (invariants 41, 46); the field values are `useState`-controlled, so
they survive every transition exactly (invariants 42, 53, 62).

**The five states, as a value (invariant 29).** The stored result is a three-arm union, not a
set of booleans:

```ts
// loginCardState.ts
type LoginResult =
  | { outcome: 'untouched' }
  | { outcome: 'noMatch' }
  | { outcome: 'serviceProblem'; correlationId: string };

export type LoginCardState =
  | { kind: 'idle' } | { kind: 'ready' } | { kind: 'submitting' }
  | { kind: 'noMatch' } | { kind: 'serviceProblem'; correlationId: string };

export function loginCardState(
  result: LoginResult, isPending: boolean, isReady: boolean,
): LoginCardState
```

`loginCardState` is pure, exhaustive and unit-tested over its full input cross-product;
`LoginPage` switches on its result and nothing else. `isReady` is
`email.trim() !== '' && password !== ''` (invariants 32, 33) - the asymmetry is the invariant's,
not an oversight. Idle and ready are derived rather than stored, which is why the stored union
has three arms and the presented one has five.

**Invariant 43, single in-flight, and the door that has to be closed *before* the dispatch.**

(a) The `Button` is rendered `busy={isPending}`, and its handler calls `event.preventDefault()`
and skips `onClick` (`src/shared/ui/Button.tsx:27-39`) - which stops both a pointer activation
and the native submit a `type="submit"` button would otherwise perform. (b) `Button` is `busy`,
not `disabled`, so it keeps its accessible name, stays focusable (invariant 44) and stays
announced as busy (invariant 115).

(c) The Enter-inside-a-field path does not go through the button at all, and **a flag checked
inside the action cannot close it.** React's `useActionState` queues a second dispatch rather
than dropping it: with `actionQueue.pending` non-null the new node is linked into the queue
(`react-dom/cjs/react-dom-client.development.js:8362-8367`), and `onActionSuccess` runs the
queued node **after** the first action resolves (lines 8434-8446). By then the first action's
`finally` has cleared any in-flight ref, so the queued action sees a clear flag, derives again
and issues a second request. The originally proposed ref is therefore not a mitigation; it is a
no-op with a comment.

The door that does work is closing the dispatch itself. `<form action={formAction} onSubmit={…}>`
with a handler that calls `event.preventDefault()` while `isPending` prevents React from ever
running the action: the form-action listener checks `nativeEvent.defaultPrevented` and, when it
is set, starts no action (`react-dom-client.development.js:19061-19064`), and it is queued after
the ordinary `onSubmit` listeners in the same dispatch (`extractEvents$1` is invoked last, line
19759), so the handler has already run when the check happens. Nothing is queued, so nothing
runs later. This costs one `onSubmit` handler and keeps `useActionState` as
ARCHITECTURE.md's named primitive - the fallback of replacing it with `useTransition` is not
needed.

Section 7's guarantee is therefore: (a) and (b) stop the pointer and the button's own submit,
(c) stops the implicit submission from a field. The action itself needs no flag; if one is kept
as a second line of defence it is documented as belt-and-braces rather than as the mechanism.

The discriminating test cannot count clicks, and it cannot count only transport calls either -
a second derivation followed by a suppressed request would pass that. It counts **both**:
exactly one `auth.sign_in_started` in the telemetry buffer (which `useLoginSubmission` emits
once per attempt, immediately after `beginInteraction()`, before the derivation runs) and
exactly one call on the fake transport. A queued second action would emit a second started
event, so the pair discriminates a suppressed attempt from a duplicated one.

**Invariant 45, and the focus it destroys (invariants 60, 110).** The action's second statement
sets the result to `{ outcome: 'untouched' }` before the derivation runs, so a stale alert is
gone the instant a new attempt starts. When the attempt was started by the **retry** control,
that same statement unmounts the control the user just pressed - the retry affordance lives
inside the service-problem alert - and focus would fall to `document.body`, which invariant 110
forbids outright.

So the retry path moves focus explicitly, as part of the transition rather than after it: the
Login control carries a ref, and the retry handler focuses it in the same commit that sets the
pending state. The Login control is `busy`, not `disabled`
(`src/shared/ui/Button.tsx:45-46` sets `aria-busy`/`aria-disabled` while line 44's `disabled`
stays bound to the caller's own `disabled` prop, not to `busy`),
so it is a legitimate focus target and it stays announced as busy - a `disabled` control would
be unfocusable and the handoff would fail silently. This is the only deliberate focus move on
the page; invariants 44, 55 and 64 all say "moves focus nowhere", and invariant 60 names this as
the exception, so the two are one contract. The check is the same one that covers every other
transition (`document.activeElement !== document.body`), plus an assertion that the element
holding focus after a retry is the Login control specifically.

**Invariant 47** hands `signal` from an `AbortController` created per submission into
`http.request`; the controller is aborted in a `useEffect` cleanup, and the `cancelled` arm
returns without setting state, without logging at error level and without an analytics event
(invariants 22, 124). **Invariant 48** needs no code: nothing about an in-flight attempt is
persisted, so a reload starts from the module's initial state.
**Invariant 49** holds in the form the invariant states: the URL is unchanged while an attempt
is in flight and across both failure outcomes, because the submission never navigates except on
success. Success **does** change the URL - that is invariants 66-70, and there is no reading of
49 under which it does not - so the invariant is scoped to the in-flight and failure windows
and 66-70 owns the one moment it changes. The e2e for 49 asserts `location.href` across submit,
no-match, service-problem and retry, and stops there; the success navigation is asserted by
67/69/70's own checks.

**Invariants 51 and 52 without a field-level message.** `Field`'s `error` prop renders a
`<p role="alert">` under the control (`src/shared/ui/Field.tsx:42-46`), which invariant 52
forbids. Both fields must still be marked invalid and described by the card-level alert
(invariants 51, 109). The kit already supports this without a new prop: `FieldContext` is
exported (`src/shared/ui/index.ts:9-10`), and `Field` renders its provider around `children`
(`src/shared/ui/Field.tsx:38-40`), so a nested provider placed *inside* `Field` and *around*
`Input` wins. The login page renders
`<Field id label required><FieldContext.Provider value={{ invalid: true, required: true, describedBy: alertId }}><Input .../></FieldContext.Provider></Field>`
in the no-match state and omits the provider otherwise. No kit signature changes and no
field-level message is rendered.

**Where the alert sits, and what that decides about tab order (invariants 24, 105).** `LoginAlert`
is rendered in the card's DOM between the heading block and the email field, which is where
mockup 1d puts it and where invariant 24 requires it. Nothing reorders it visually against the
markup: no `order` utility, no absolute positioning, no positive `tabindex` anywhere in the
card. That single choice fixes reading order, visual order and tab order as one order, and the
order it fixes is: alert controls, email, password, Login.

Invariant 105 is written to match, and it had to be: the alternative readings all cost more than
they buy. Placing the alert after the Login control in the DOM and moving it up visually would
put a `role="alert"` between the control and the footer for a screen-reader user while showing
it above the fields for everyone else - the reading-order mismatch WCAG 1.3.2 exists for. A
positive `tabindex` on the fields would drag every other tab stop on the page into the same
manual ordering. And the whole question concerns exactly one control, the service-problem
alert's retry affordance, which is the thing the visitor is being asked to press. The no-match
alert has no control at all, so in that state the order is simply email, password, Login.

The Tab-sweep check in the test map asserts this order per state, so a later "fix" that reorders
the DOM fails a test rather than quietly changing which order the page has.

The danger BORDER is the one thing this cannot reach, because `Input`'s class string is fixed
(`src/shared/ui/Input.tsx:35`). It is supplied by a single rule in `theme.css` -
`input[aria-invalid='true'] { border-color: var(--color-danger); }` - which is a token-layer
concern, domain-free, and keeps the kit's signature untouched.

**Invariants 34-37, 39, 40, 106, 107.** The `Button` is `disabled` (not `busy`) while
`!isReady`, which is the platform's own meaning of the word - out of the tab order,
unfocusable, inert to activation - and is what invariant 35 records as the user's decision.
Enter inside a field then does nothing, because implicit submission requires a non-disabled
default button (invariant 34, 107). Both `Field`s pass `required`, which `Input` forwards to
the DOM (`src/shared/ui/Input.tsx:34`), carrying invariant 37's only programmatic signal.
`type="password"` masks with no reveal control (invariant 39); `autoComplete="username"` and
`autoComplete="email"`/`"current-password"` give a password manager what it needs
(invariant 40), and `autoComplete` is on the i18next attribute exclude list
(`eslint.config.js:214`) so it does not trip the literal rule. Each field's accessible name is
its `<label>` (`src/shared/ui/Field.tsx:37`), never its placeholder (invariant 106). No email
format validation is performed anywhere, in markup or in code (invariant 38) - `type="email"`
is deliberately NOT used on the email input for that reason, `type="text"` is.

**The kit needs three additive changes, and all three are design findings raised under invariant
141** - not two, as an earlier draft of this spec claimed. Invariant 141 says a change to a kit
public surface is a finding to raise rather than a diff to slip in, so all three are raised here
with what they cost and what was rejected. The user has approved all three.

1. **`Input` gains `readOnly?: boolean`.** The submitting state's fields must be non-editable
   but still tabbable and still announced with their values (invariants 41, 114), which is
   `readOnly` and not `disabled`. `Input` supports neither today
   (`src/shared/ui/Input.tsx:5-37`).
2. **`Input` gains `placeholder?: string`.** Invariant 106 requires the placeholder
   `you@foo.com`, decorative and never the field's accessible name.
3. **`Button` gains busy-spinner support.** This is the change the spec previously missed
   entirely, and three invariants depend on it. Invariant 41 requires the busy control to be
   "pressed-violet with a spinner"; mockup 1c shows the spinner glyph inside the button;
   invariants 30 and 115 both describe a spinner element's behaviour (no animation under
   `prefers-reduced-motion`, and the spinner not being the only busy signal). `Button` renders
   `{children}` and nothing else (`src/shared/ui/Button.tsx:49-51`), there is no `Spinner`
   anywhere in the kit (`src/shared/ui/index.ts:1-13`), and `VARIANT_CLASS.primary`'s pressed
   fill is `hover:bg-primary-pressed` (line 14), so an un-hovered busy button paints the
   un-pressed violet. The change is additive and domain-free: when `busy` is set, `Button`
   renders a decorative spinner element (`aria-hidden`) before its children and applies the
   pressed fill unconditionally rather than on hover. No new prop is needed - `busy` already
   exists and already carries the meaning - so the signature is unchanged and only the
   rendering widens.

All three are primitives or pure presentation, so invariant 142 (the kit stays domain-free) is
intact. Rendering a bare `<input>` inside the feature was rejected for (1) and (2): it
duplicates the `FieldContext` wiring the kit exists to own, and it would put a second input
implementation in the repository. A feature-owned spinner was rejected for (3) for the same
reason plus a worse one - the busy presentation would then live in two places, and the kit's
own `busy` prop would be a half-implementation that the next caller re-discovers.

The kit's own state inventory (`src/app/testing/kitStates.tsx`) gains the three new states -
a read-only `Input`, an `Input` with a placeholder, and a busy `Button` - so the kit route
renders them and the axe and contrast sweeps that walk that inventory cover them. (An earlier
draft attached this to "invariant 87's coverage"; invariant 87 in this spec's numbering is the
guard's history behaviour and says nothing about the kit inventory. The obligation is invariant
141's, and the inventory is how a reviewer sees the three changes rather than reads about them.)

### 8. Catalogues and telemetry

**`features/auth/locales/en/auth.json`** replaces its three placeholder keys with the login
surface's strings, one `login.*` group: `documentTitle`, `heading`, `subtext`, `emailLabel`,
`emailPlaceholder`, `passwordLabel`, `footerNote`, `footerNoteSubmitting`, `submit`,
`submitting`, `noMatchMessage`, `serviceProblemMessage`, `serviceProblemCorrelationLabel`,
`retry`, `wordmark`. Every one is a surface invariant 116 enumerates.

`serviceProblemCorrelationLabel` is the key an earlier draft of this list omitted, and the
omission would have surfaced as a test failure rather than as a design conversation: invariant
58 requires the alert to render the correlation id, invariant 116 requires every user-visible
string to come from a catalogue, and `vitest.setup.ts:17-23`'s empty-`missingKeyReports`
assertion fails the suite for any key the catalogue does not have. A bare 32-hex string on
screen with nothing naming it is also unusable by the visitor it exists for - the user story
asks for "an identifier I can quote when I report it", which needs a word in front of it.
Interpolating the id into `serviceProblemMessage` was the alternative; a separate label keeps
the id selectable as its own text node, which is what the e2e assertion reads. The namespace loads with the login route through the
existing `loadTranslations` path (`src/features/auth/loadTranslations.ts:12-28`), so
`build-output/catalogue-chunks.test.ts:32-37`'s assertion that `LoginRoute.tsx`'s dynamic
imports are exactly the auth catalogue continues to hold.

**`app/locales/en/common.json`** gains a `header.*` group: `eyebrow`, `pageTitle`, `logout`,
`signedInFallback` (invariant 99's neutral presentation), `nameLoading` (the busy label).
These live in `common` rather than in `auth` or `hierarchy` for a mechanical reason: the
header is composed by `app`, and pulling `auth`'s namespace onto the home route would make the
home route chunk dynamically import the auth catalogue chunk, breaking
`build-output/catalogue-chunks.test.ts:32-37` and muddying invariant 117's "the login chunk
carries no hierarchy strings" into its mirror image. `common` is statically bundled by
`createRuntime.ts:21`, so the header's strings are present on whichever route renders it -
which satisfies invariant 117 - at a cost of a few dozen bytes in the entry.

**`analyticsEvents.ts`** gains three entries beside the existing three
(`src/platform/observability/analyticsEvents.ts:3-9`), which is an addition to the catalogue
and not an edit to it (invariant 139):

```ts
'auth.sign_in_started': { correlationId: string };
'auth.sign_in_settled': { correlationId: string; outcome: SignInOutcome };
'auth.signed_out':      { correlationId: string };
```

with `signInOutcome.ts` a const object `{ SignedIn: 'signedIn', NoMatch: 'noMatch', ServiceProblem: 'serviceProblem' }`
plus its derived type, in the shape `webVitalMetricName.ts` already uses. No payload carries a
user id, an email or anything derived from a credential (invariants 125, 126); the settled
event's three-value outcome is the whole of what invariant 121 asks for.

**The correlation id (invariants 63, 121, 123).** A submission is an interaction, and it is
not a navigation, so the router-driven tracker does not open one for it.
`InteractionTracker` (`src/app/routing/createInteractionTracker.ts:14-23`) gains a
`beginInteraction(): string` that sets the same private slot `currentCorrelationId()` reads
(lines 28-36, 70) and returns the new id. `useLoginSubmission` calls it at the top of each
attempt, so the id on `auth.sign_in_started`, on the http client's timing record
(`createHttpClient.ts:76, 142-151` reads `correlationId()`, which
`createRuntime.ts:54-56` wires to the tracker), on the error log, on `auth.sign_in_settled`
and on the correlation id rendered to the user are all literally the same string. This is an
`app`-layer change; `app` is not on invariant 141's list, and the alternative - a
per-request correlation-id parameter on `HttpRequest` - would change the http client's public
surface for no additional guarantee.

A no-match settles with `outcome: 'noMatch'` and is logged at `info`, never `error`, and never
reaches an error boundary (invariants 122, 138). A service problem is logged at `error` with
the correlation id (invariant 123). A cancelled attempt emits neither (invariant 124).

### 9. Test strategy

See "Testing and validation" below for the invariant-by-invariant map. The structural
decisions:

- The derivation, `loginCardState`, `resolveDestination` and the checksum are pure and unit
  tested to the 100% threshold `vitest.config.ts:67-72` already declares for
  `src/features/*/domain/**`; `resolveDestination` and `loginCardState` sit outside `domain/`
  today and are proposed to move under it, or the threshold key is widened - either way the
  choice is explicit rather than incidental.
- The lookup, the session functions and the guards are unit tested against
  `createFakeTransport` (`src/shared/testing/createFakeTransport.ts:20-29`, keyed by
  `` `${method} ${pathname}` ``) and `createFakeClock`
  (`src/shared/testing/createFakeClock.ts:55-70`, manually advanced), so no test waits on a
  real timer and no test reaches the network - `vitest.setup.ts:13-15` throws on any `fetch`.
- Component tests render through `renderRoute.tsx` under `Locale.Test`, so every assertion is
  a key rather than a copy of the prose (invariant 118).
- The live proof of invariants 6, 6a and 97e is a new case in
  `scripts/live-smoke/live-smoke.test.ts`, which is outside `src` and collected by no default
  Vitest project (`vitest.config.ts:39-41`) and runs only under `npm run smoke:live` from the
  `workflow_dispatch` job. It fetches `/users.json`, takes the first record that carries both
  an email and a password, derives the secret from those two values at run time, fetches
  `/secrets/<secret>.json`, and asserts the returned id equals that record's id. It then
  continues, which is invariant 97e's half: it fetches `/users/<that id>.json`, runs the real
  `signedInUserSchema` over the response, and asserts the display name the header would render
  is a non-empty string. Without that second half nothing in the phase proves the header can
  ever resolve a real name - every gating check of the resolved presentation feeds a mocked
  record, so an implementation whose field names do not match the live payload passes every
  gate and shows the neutral fallback to every real visitor, which is precisely the silent
  failure invariants 5 and 6 exist to prevent one layer down. Nothing credential-shaped is
  written down, the account is whichever the database serves, the assertion failure message
  names the field keys actually found (`docs/reference.md:13` records that they are
  unconfirmed), and the gating suite never depends on the backend.
- The security invariants are asserted mechanically, not by inspection, and the substring
  assertions are stated in the form that is actually satisfiable. Invariant 125 reads the
  telemetry buffer through `window.__hierarchyTreeTelemetry` (`src/vite-env.d.ts:10-17`) and
  asserts two things of `JSON.stringify(buffer)`: that it does not contain the typed email, the
  typed password or the derived secret **in full**, and that it contains **no twelve-character
  window** of any of the three. The window check is a small loop over the credential's own
  substrings, not a regex, and the e2e drives high-entropy credentials so a twelve-character
  collision with ordinary JSON does not occur. A literal "no substring at all" - what invariants
  76 and 125 said before this spec was reviewed - is false for any one-character password
  against any JSON document, so it would have been quietly weakened into the whole-value check
  by whoever wrote the test; naming both halves is what stops that. Invariants 129 and 131 run
  the same pair against `location.href`, `document.title`, `JSON.stringify(history.state)`, the
  serialised DOM and every storage entry; invariant 76 runs it against the stored bytes; 128
  counts the requests Playwright observed during a sign-in. The residue - a leak shorter than
  twelve characters - is in the review-dependent list.

## Milestone split (proposed)

Four milestones. The ordering constraint is that each boundary must be a command that can go
green: `npm run verify` is the full chain at every boundary, and `npm run e2e` from M2 onward.

- **M1 - The pieces below React: derivation, lookup, session, the guards' pure core, and the
  runtime fields everything above will need**
  - Delivers: `features/auth/domain/**` (the table, its two checks, the normaliser, the
    derivation, the branded types); `features/auth/data/**` for the lookup
    (`secretResourcePath`, `userResourcePath`, `lookupResultSchema`, `lookupUserIdentifier`);
    `features/auth/session/**` with the shadow-first session store;
    `platform/runtime/createTabStorage.ts` and its port; `resolveDestination`; the `redact.ts`
    path-segment rule; **`createRuntime`'s `tabStorage` and `signedInUserStore` fields and
    `renderRoute.tsx`'s fakes for both**; and the three guard narrowings this milestone needs -
    the `/secrets` path allow-list added to `checkWholeScopeVocabulary` in
    `scripts/assert-domain-vocabulary.mjs:138-168`, the one-file `sessionStorage` override in
    `eslint.config.js`, and the matching updates to `scripts/eslint-configuration.test.ts:52-95`
    and `scripts/guard-scripts.test.ts`.
  - The runtime fields land here, not where they are first read, because M2's claimed sign-in
    e2e is unverifiable without `tabStorage` reaching the page: `writeSession` is deliberately
    off the barrel (section 1.1), so `app` has no other route to a storage instance, and
    scheduling the field in M3 would make M2's boundary a command that cannot go green. Both
    fields ship in one change to a frozen record rather than in two.
  - Because `createRuntime` constructs `signedInUserStore` here, **`createSignedInUserStore.ts`
    and its barrel export land here too**, in their complete form: the factory, its memo-by-id
    map, and the `read(userId)` that returns a promise which never rejects (section 6). What M4
    adds is not the store's other half but its only *reader* - the header. Splitting the factory
    itself across a milestone boundary would leave M1 with a `createRuntime` that does not
    compile, which is the boundary condition this milestone plan exists to prevent.
    `fetchSignedInUser.ts`, `signedInUserSchema.ts` and `signedInUserView.ts` ship with it, for
    the same reason: they are what `read` is made of.
  - Verifiable because: `npm run verify` is green as a whole chain, with the new `domain`
    directory holding the 100% threshold that `vitest.config.ts:67-72` arms automatically, and
    the two demonstrable negatives (a `sessionStorage` read from a second file, a `/secrets`
    literal in a second file) captured as evidence and reverted. **No e2e is claimed**: nothing
    user-visible changes, and saying so is the point.
  - Depends on nothing.
- **M2 - The login card and its five states**
  - Delivers: `LoginPage` and its internals, `LoginPageDependencies`, `loginCardState`,
    `useLoginSubmission`, the rewritten auth catalogue (including
    `serviceProblemCorrelationLabel`), the three analytics events and `signInOutcome`,
    `beginInteraction` on the tracker, the **three** additive kit changes (`Input.readOnly`,
    `Input.placeholder`, `Button`'s busy spinner) with their kit-state inventory entries, the
    `theme.css` invalid-border rule and the four new `contrastPairs` entries, and the real
    `LoginRoute.tsx` wrapper that injects the feature's dependencies including `navigate`. On
    success it writes the session and navigates with `replace`.
  - Verifiable because: the component suite covers all five states, the keyboard contract and
    axe; and the e2e run gains a `login.spec.ts` exercising idle, ready, submitting, no-match
    (a `null` body) and service-problem (a 500), plus the network assertion that authenticating
    issued exactly one request and it was not the users path (invariants 13, 14, 128), plus
    the telemetry-buffer assertion for invariant 125, plus axe over each of the five states.
    `e2e/telemetry-buffer.spec.ts:26`'s pattern assertion is replaced here by the substring
    assertion the phase actually needs, **and its `sessionStorageLength === 0` assertion (lines
    44-50) is narrowed here to "empty before sign-in, exactly one entry after"** - a real
    sign-in in M2 writes a session record, so leaving that assertion alone would turn M2's
    boundary red. `e2e/support/routeMocks.ts` gains an API-mock helper registered after the
    catch-all so it takes precedence.
  - **M2 owns the migration of every existing assertion about the login placeholder**, for the
    same reason M3 owns the specs the guard breaks: this milestone deletes
    `AuthPlaceholderPage.tsx` and its three catalogue keys, so `login.title` and
    `login.documentTitle` stop existing and the heading key becomes `login.heading`. Under the
    key-echoing test locale these assertions fail on the key itself, not on prose, so they fail
    loudly - but they fail at M2's boundary, which claims a green `npm run e2e`. The five:
    `e2e/placeholder-routes.spec.ts:41-44` (its login case, which M3's list deliberately does
    not cover), `e2e/telemetry-buffer.spec.ts:40-42`, `e2e/accessibility.spec.ts:7` and
    `e2e/right-to-left.spec.ts:36` (both the `{ path: '/login', heading: 'login.title' }`
    entry), and `e2e/deployed-smoke.spec.ts:25-33`, which asserts the literal placeholder prose
    "Sign in isn't built yet" and therefore fails post-merge rather than at the boundary - it is
    migrated here with the rest so the deployed smoke matches what the branch actually ships.
  - Depends on M1 for the derivation, the lookup, the session write and `runtime.tabStorage`.
- **M3 - The guard, the router, and the authenticated shell**
  - Delivers: `routeDefinitions(runtime)`, the pathless authenticated layout route **and the
    `AuthenticatedLayout` shell itself, its `authenticatedLoader`, and the `signedInUserStore`
    wiring the loader reads** - M4 adds only what renders inside the header, not the route that
    holds it; `requireSession`, `redirectSignedInVisitor`, `withSessionGuard` and its structural
    test, the `redirect` import-ban narrowing **in both ESLint blocks**, and
    `createBackForwardRestore`. The route and chunk declarations in `.size-limit.json` and
    `build-output/expected-build-output.json` gain the new `AuthenticatedRoute` chunk.
  - **M3 owns the migration of every existing e2e spec that visits a route this milestone
    guards.** Guarding `/` invalidates them the moment the guard lands, so they move in the same
    change or the boundary cannot go green:
    - `e2e/placeholder-routes.spec.ts:6-30` (the home-route test) and `:48-67` (the skip-link
      test, which reaches the skip link via `/`) - both sign in first, or assert the redirect.
    - `e2e/telemetry-buffer.spec.ts:5-27` and `:29-51` - both `goto('/')`; the first also
      asserts exactly one `app.route_viewed`, which a guarded redirect changes.
    - `e2e/accessibility.spec.ts:5-9` - the `{ path: '/', heading: 'home.title' }` entry.
    - `e2e/right-to-left.spec.ts:34-37` - the same entry.
    - `e2e/not-found.spec.ts:18-24` - clicks the home link and asserts `home.title`; signed out
      it now lands on the login card (invariant 137), so the spec asserts both session states.
    - `e2e/development-console.spec.ts:9-22` - iterates `['/', '/login']`.
    - `e2e/deployed-smoke.spec.ts:11-34` - asserts the literal placeholder prose on `/` **and**
      on `/login`, and both change in this phase. It runs only in the post-merge `deployed`
      project, so it fails after merge rather than at the boundary, which makes it the easiest
      one to forget.
    Invariant 143's check is restated accordingly: `HierarchyPlaceholderPage.tsx` being
    byte-unchanged is asserted **by a direct file assertion plus its own component test**, not
    by "the existing placeholder tests still passing untouched" - `placeholder-routes.spec.ts`
    is one of those tests and cannot pass untouched once `/` is guarded.
  - Verifiable because: `guard.spec.ts` runs the flows that decide invariants 84-93 - a
    bookmarked authenticated URL redirecting to `/login?from=…` with no users request and no
    flash (the mutation-observer form of section 5.3); signing in from there landing on the
    bookmarked path; a signed-in visitor typing `/login` bouncing straight to the destination;
    and Back from the login card returning to where the visitor came from, run **twice** - once
    reaching the guarded URL by `page.goto` (the current-entry case) and once by clicking an
    in-app link (the push case), because a single unconditional redirect action passes one and
    fails the other. Plus a crafted `from=//evil.example` and `from=/\evil.example` landing on
    `/` rather than off-origin.
  - Depends on M1 (session, `resolveDestination`, the runtime fields) and M2 (a success path to
    redirect into).
- **M4 - The header's contents and signing out**
  - Delivers: `SignedInHeader`, `SignedInName`, `SignedInAvatarPlaceholder`, the
    `header.*` keys in `common`, and the `auth.signed_out` event. The layout route and the
    loader it hangs off already exist from M3, and the store the loader reads ships whole in M1,
    so this milestone adds no routing and no data access - it adds the store's first reader.
  - Verifiable because: `header.spec.ts` covers the resolving skeleton, the resolved name and
    initials, the failed-resolution neutral presentation (asserted to be the static placeholder,
    not the pulsing skeleton) with the page beneath still rendered, a single user request across
    two navigations between authenticated routes (invariant 97b), the keyboard path that types
    credentials, submits with Enter, and then tabs to logout (invariant 113), and axe over the
    header in both themes. A component test asserts the parsed record has no `password` key at
    any depth (invariant 97a) by feeding a fixture that carries one. The live case of invariant
    97e is added here, outside the gating suite.
  - Depends on M3 for the layout route and its loader, and on M1 for `readSession` and the store
    field.

Dependency edges: M1 -> M2 -> M3 -> M4, fully sequential.

**Worktree fan-out does not pay here.** The only pair that looks independent is M3 and M4, and
it is not: M4's header is rendered by the layout route M3 creates, and both edit
`routeDefinitions.ts`. More decisively, all four milestones edit the same five files -
`src/features/auth/index.ts`, `src/platform/observability/analyticsEvents.ts`,
`src/app/routing/routeDefinitions.ts`, `src/features/auth/locales/en/auth.json` and
`src/app/locales/en/common.json` - where a bad three-way merge is
silent rather than loud: a dropped barrel export fails the build, but a dropped analytics
entry or a dropped catalogue key fails only whichever test happens to reach it. The wall-clock
saving on a four-milestone phase is not worth losing an enforcement edit without noticing. Run
sequentially.

## Testing and validation

Categories as in phase 1: **unit** (Vitest), **component** (Vitest + Testing Library + axe),
**e2e** (Playwright), **lint** (a rule demonstrated failing), **script** (a repository
assertion), **live** (the explicitly invoked live suite), **review**.

### The derivation (1-12)

- 1 - unit: the output matches `/^[0-9A-F]{64}$/` over a table of inputs; explicit negative
  assertions for lowercase, for length 63 and 65, and for any separator character.
- 2 - unit: the same inputs produce the same output across repeated calls; plus the mechanical
  half, which is that `vitest.setup.ts:13-15`'s throwing `fetch` and the lint bans on
  `Date.now`, `Math.random` and the storage globals (`eslint.config.js:58-99`) apply to this
  module with no override, so I/O, clock and randomness are lint failures rather than habits.
- 3 - unit: a 3-character password normalises to its characters cycled to exactly 32 units; a
  90-character email normalises to its first 32; both asserted as arrays, not lengths.
- 4 - unit: a table-driven case per position for a hand-worked input, asserting the XOR, the
  `& 0xff` reduction, the table index and the two-digit zero-padded uppercase rendering; plus
  one case where a normalised input is **shorter than 32** (an astral email, per invariant 7),
  asserting that the tail positions are driven by the other input alone - `undefined ^ x === x` -
  and that the output is still 64 characters. The short case is asserted here rather than only
  under invariant 7 because "each of the 32 positions" is this invariant's claim and the short
  array is the thing that makes it non-obvious.
- 5 - unit, both checks of section 2: the `docs/task.md`-derived fixture and the recorded
  FNV-1a constant, plus the structural assertions (length exactly 256, every entry an integer
  in 0-255). Stated honestly: these prove the table has not drifted, not that it was
  originally right - invariant 6 is what proves that.
- 6, 6a - live only. The new `scripts/live-smoke/live-smoke.test.ts` case of section 9. A test
  asserting its own absence from the gating suite is not needed: both default Vitest project
  includes are rooted at `src/` and the `tooling` project matches `scripts/*.test.ts` with one
  path segment (`vitest.config.ts:39-41`), and `scripts/workflow-configuration.test.ts`
  already asserts the `live-smoke` job's only trigger is `workflow_dispatch` and that it
  appears in no `needs` list.
- 7 - unit, and the expectations are computed from the brief rather than written by hand. The
  test file evaluates the brief's own `make32`/`encode` source - extracted from `docs/task.md`
  the same way invariant 5's fixture extracts the table - and asserts `deriveSecret` equals
  `encode` for every case, so "the brief's bytes" is a value the brief produced rather than a
  value the implementer believed. The cases: a BMP code unit above 255 (low byte via `& 0xff`);
  a non-BMP character, asserted to contribute its **high surrogate only** and to make the
  normalised array **shorter than 32**, explicitly **not** two surrogate code units; a
  truncation that splits a surrogate pair; and a normalised array short enough that at least one
  tail position reads `undefined`, asserted to produce the other input's code unit unchanged.
  The email side is compared with the trim applied, since `deriveSecret` trims and `encode` does
  not (invariant 9), and the test says so at the assertion rather than in a header comment.
  Naming matters here: the test is named for invariant 7 and carries a comment stating the
  behaviour is a preserved defect, so a later reader does not "fix" the module and the test
  together.
- 8 - unit: `deriveSecret(e, 'ab') === deriveSecret(e, 'abab')`, asserted as intended
  behaviour with the invariant number in the test name so a later reader does not "fix" it.
- 9 - unit: leading and trailing whitespace trimmed; an uppercase letter, internal whitespace
  and punctuation all preserved, each asserted by a differing output against the lowercased or
  normalised variant. Plus the deviation asserted as a deviation: `deriveSecret(' a@b.c ', p)`
  equals `deriveSecret('a@b.c', p)` and **differs** from the brief's `encode(' a@b.c ', p)`, in
  a test named for the deviation, so the divergence from `docs/task.md:47-49` is a recorded
  expectation rather than an accident nobody can see.
- 10 - unit: a password of one space produces a defined secret; `' a '` and `'a'` differ.
- 11 - unit: an empty email and an empty password each throw, and the throw happens without
  entering a loop (asserted by the call returning within the test rather than timing out).
- 12 - unit + component + e2e. Unit: `deriveSecret`'s module exports nothing but the function,
  and the submission's result union (section 7) is structurally incapable of holding either
  input - a `@ts-expect-error` assertion on assigning an email into it. Component: after
  unmounting the login page, neither value is reachable from anything the test still holds -
  asserted by driving a submission, unmounting, and running the substring pair over the
  telemetry buffer and the fake storage. E2E: the substring assertions of invariants 125 and
  129, which are where this is actually decided. What is **not** asserted, because the invariant
  no longer claims it: that the values are absent from component state while the page is
  mounted. They are there, controlled inputs put them there, and invariant 12 says so.

### The lookup (13-22)

- 13, 14, 128 - e2e, from the network log, and **windowed** so it survives M4. `page.on('request')`
  collects every request to the API origin with a timestamp. The assertion is in two parts:
  within the authentication window - from the submission until the lookup response is observed -
  there is **exactly one** request, its path starts with `/secrets/`, and no path contains
  `users`; and across the whole flow, no request path is `/users.json` or any collection form,
  ever. After M4 the log legitimately contains a second request, `/users/<id>.json`, issued
  after the window closes (invariants 14, 97); the check must be written this way from M2
  onward, because a flat "exactly one request to the API origin, and no path contains `users`"
  goes green in M2 and **must** go red in M4, and a check that has to be rewritten to keep
  passing is a check nobody trusts. Invariant 97/97d's own entry asserts the second request from
  the other side.
- 15 - unit: the `HttpRequest` object the fake transport receives has no query string, no body
  and no header beyond `traceparent` (which `performAttempt.ts:18` sets for every request).
- 16 - unit: a `null` body produces `{ kind: 'noMatch' }`, exactly one transport call (no
  retry), and no error-level record on a spy sink.
- 17 - unit: a valid id produces `{ kind: 'signedIn' }` carrying it.
- 18 - unit, table-driven over `{}`, `[]`, `''`, `true`, `1.5`, `Infinity`: each produces
  `serviceProblem`, and explicitly **not** `noMatch`. The last two are the cases a naive
  `typeof === 'number'` check would pass.
- 18a - unit, three groups. (i) `'u-7'`, `'u_7'` and `42` all produce `signedIn` and all carry
  forward as the same `UserIdentifier` type, asserted by round-tripping each through
  `userResourcePath`. (ii) The hostile charset table - `'../secrets'`, `'a/b'`, `'a?b'`,
  `'a#b'`, `` 'a\\b' ``, `'a b'`, `'a.b'`, `''` - each produces `serviceProblem` and explicitly
  **not** `signedIn`, so a path-traversing id never becomes an identifier. (iii) The encoding
  half, asserted independently of (ii) so neither is the other's only line of defence: given a
  `UserIdentifier` built directly in the test, `userResourcePath` percent-encodes it and the
  resolved URL's pathname still begins `/users/`. The same charset table is run against
  `sessionRecordSchema`, asserting a stored record carrying one is treated as unreadable
  (invariant 77) rather than as a session.
- 19 - unit, one case per failure kind (a throwing transport, a deadline reached on the fake
  clock, 404, 500), each asserted to produce `serviceProblem` and never `noMatch`; plus the
  component test asserting the two states render differently and the e2e asserting the two
  alerts are distinguishable.
- 20 - unit: the retry behaviour is asserted to be the client's, not the caller's - a 500
  produces two transport calls, a 404 produces one, **a deadline reached on the fake clock
  produces one** (the aborted branch returns before `shouldRetry`, `createHttpClient.ts:121-133`
  - this case is asserted explicitly because the predicate's `timeout` member reads as though it
  would produce two), and the whole call settles within the configured deadline on the fake
  clock. No login-specific timer exists, asserted by a grep for `setTimer` in `features/auth`
  returning nothing.
- 21 - review, with the mechanical half named: the lookup is a GET with no body and the
  repository holds no mutable state, so a duplicate request changes nothing. The unit test
  asserting two identical calls produce identical results is the closest a test gets.
- 22 - unit + component: an aborted signal produces the `cancelled` arm, which sets no state,
  emits no `auth.sign_in_settled` and produces no error-level record; the component test
  unmounts mid-flight and asserts no act warning, no state update, **no error-level record and
  no `auth.sign_in_settled`**. Not an empty sink: a caller-aborted request emits two records
  before returning `cancelled` - `logger.debug('http.request_cancelled', …)` and a timing record
  with `outcome: 'cancelled'` (`createHttpClient.ts:104-118`) - and both reach `dispatch` and so
  the sink. Both are correct under invariants 22 and 124, which forbid an *error-level* log and
  a *failure* telemetry event, not all observability. An empty-sink assertion would fail on a
  correct implementation, and the obvious way to make it pass would be to stop recording the
  cancellation, which is the opposite of what this phase wants.

### The page and its states (23-30, 31-49, 50-65)

- 23, 24, 27 - component + e2e: the card's children asserted in document order; the alert
  asserted to sit between the heading block and the email field; a 320px viewport asserting
  `scrollWidth <= clientWidth` in each of the five states (jsdom cannot decide overflow, so
  that half is e2e only).
- 25 - component: exactly one `h1`, inside the `main` landmark `ApplicationLayout` provides
  (`src/app/layout/ApplicationLayout.tsx:13-15`), with the skip link still first.
- 26 - component: `document.title` equals the catalogue key under the test locale.
- 28 - unit: the four new `contrastPairs.ts` entries (`focus-ring`/`canvas-login`,
  `ink`/`canvas-login`, `danger`/`danger-surface` already present, `ink`/`canvas-app` for the
  submitting fields) walked by the existing contrast test in both themes; plus the raw-colour
  grep already run by `npm run lint`.
- 29 - unit: `loginCardState`'s full input cross-product, asserting exactly five reachable
  outputs and no skeleton or empty arm - the type itself is the assertion, and an
  `@ts-expect-error` case proves a sixth kind does not typecheck.
- 30 - e2e under `prefers-reduced-motion: reduce`: the spinner's computed `animation-duration`
  is the zeroed value `theme.css:97-105` sets, and the five states remain distinguishable by
  text.
- 31, 32, 33 - component with `user-event`: the initial render has empty fields, no alert, the
  footer note and a disabled control; typing into both enables it; emptying either disables it
  immediately; a whitespace-only email leaves it disabled while a whitespace password does not.
- 34, 35, 107 - component: with the control disabled, a click, Enter and Space on it and Enter
  inside each field all produce zero transport calls; the control is asserted absent from the
  tab order (`toHaveAttribute('disabled')` plus a Tab sequence that skips it) and unfocusable.
- 36 - review. This is a recorded trade-off, not a behaviour; the mechanical parts of it are
  invariant 35's assertions and invariant 37's.
- 37 - component: both inputs report `required`, and axe reports zero violations.
- 38 - component + script: an email of `not an address` submits and produces a real lookup; a
  grep asserts no `type="email"`, no `pattern=` and no `novalidate` handling anywhere in the
  feature.
- 39 - component: `type="password"`; a grep asserts no reveal control and no state holding the
  password as visible text.
- 40 - component: both fields carry the documented `autoComplete` values; a programmatic value
  set plus an `input` event produces the same enabled state as typing.
- 41, 42, 114 - component: in the submitting state both inputs are `readOnly` (not `disabled`),
  keep their values, remain in the tab order and remain announced; the control reads the
  submitting label and carries `aria-busy`.
- 43 - component, the discriminating form: with a transport whose response is held open,
  activate by pointer, then by Enter on the control, then by Enter inside a field, and assert
  **both** that the transport was called once **and** that exactly one `auth.sign_in_started`
  reached the buffer. The transport count alone does not decide the invariant, which says "no
  second derivation and no second request": a second action that derived and was then suppressed
  downstream would pass a call count. `auth.sign_in_started` is emitted once per attempt
  immediately after `beginInteraction()` and before the derivation (section 7), so a second
  attempt entering the action is visible whether or not it reaches the transport.
- 44 - component: `document.activeElement` is **the same element** before and after the
  transition into and out of submitting - asserted twice, once with the submission started from
  the control and once with it started by Enter inside the email field, because the invariant is
  about the transition rather than about a particular element. The control's accessible name is
  non-empty throughout and it remains focusable (`busy`, not `disabled`).
- 45 - component: after a no-match, starting a second submission removes the alert before the
  second response arrives.
- 46 - unit: the submitting state persists until the client settles, driven by the fake clock;
  a grep asserts no `setTimer` in the feature.
- 47 - component: unmounting mid-flight aborts, produces no state update and no error record.
- 48 - e2e: reload during a held-open request; the page returns to idle with both fields empty.
- 48a - e2e + component. E2E: with a held-open request, press Back; the request is aborted, no
  error surfaces, and the destination renders. Then Forward onto `/login`; the card shows no
  spinner, no "Signing in…" label and no busy control. The same Forward assertion is run after a
  no-match and after a service problem, so a restored alert is allowed and a restored
  *submitting* state is not. Component: dispatching a synthetic `pageshow` with
  `persisted: true` while a request is in flight aborts the controller, clears the result to
  `{ outcome: 'untouched' }`, and leaves both field values byte-identical - which is the half a
  browser suite cannot drive deterministically, since Playwright cannot reliably force a bfcache
  restore (see Risks).
- 49 - e2e: `location.href` is unchanged across submit, no-match, service-problem and retry, and
  the `from` parameter survives each. The successful path is deliberately **not** asserted here -
  success navigates, by invariants 66-70 - and the entry says so, so a later reader does not
  read 49 as forbidding the navigation and "fix" the success path to stay put.
- 50, 51, 52, 109 - component: a `null` response renders the alert between the heading and the
  email field; both inputs carry `aria-invalid` and `aria-describedby` pointing at the alert;
  and **no element exists under either field** - asserted by counting `role="alert"` nodes,
  which must be exactly one, and by asserting the `Field`'s error paragraph id is absent.
- 53, 62 - component: both values, including the password, are byte-identical after the
  response.
- 54 - component: the control returns to its enabled appearance because both fields are
  non-empty.
- 55, 64, 108 - component: both alerts have `role="alert"`; the element holding focus before the
  response arrives is **the same element** holding it after the alert appears - asserted once
  with the submission started from the Login control and once with it started by Enter inside a
  field, since invariant 107 makes both real and only the "does not move" form is true of both.
- 56 - component: typing after the alert appears leaves both the alert and the invalid marking
  in place; starting the next submission removes both.
- 57 - component: emptying a field with the alert showing disables the control and leaves the
  alert.
- 58, 61 - component: the service-problem alert's text and correlation id are distinct from the
  no-match alert's, and neither input is marked invalid.
- 59 - component: the retry control is a `<button>`, reachable by Tab, operable by Enter and
  Space, with an accessible name from the catalogue and distinct from the Login control.
- 60 - component, two halves in one test. The credential half: edit a field, then retry, and the
  transport receives the secret derived from the **edited** values, asserted by deriving the
  expected secret in the test rather than by capturing the first attempt's. The focus half, which
  is the one no check covered before: after activating the retry control, assert
  `document.activeElement` is the Login control - not `document.body`, and not the removed retry
  control - and that the Login control is `aria-busy` and focusable. Retry unmounts the alert the
  retry control lives in (invariant 45), so without the deliberate handoff focus falls to the
  body and invariant 110 fails. The generic sweep under 105/110 asserts
  `document.activeElement !== document.body` after every transition; this entry is the specific
  one, because "not body" would also be satisfied by focus landing somewhere arbitrary.
- 63 - component + e2e: the rendered correlation id equals the `correlationId` on the failed
  request's timing record and on the error log entry in the buffer, and matches
  `/^[0-9a-f]{32}$/` (`createCorrelationId` renders 16 bytes as hex).
- 65 - component: a retry that succeeds clears the alert and navigates; a retry that returns
  `null` replaces it with the no-match alert; at no point are two alerts present.

### Success, navigation and the session (66-83)

- 66 - unit: `writeSession` is synchronous, so a `readSession` immediately after returns the
  record; plus the e2e that a successful sign-in never bounces back to `/login`.
- 67, 69 - e2e: with `?from=/some/deep/path`, sign-in lands there; with no `from`, on `/`; with
  `?from=/nope`, on the not-found route rather than on `/`.
- 68, 92 - unit, table-driven over `//evil.example`, `/\evil.example`, `https://evil.example`,
  `evil.example`, `?from=` empty, and a `from` carrying credential-shaped text: every one
  resolves to `/`, or (for the last) is carried through as an opaque path and still subjected
  to the same-origin test. Plus an e2e for the two protocol escapes, asserting the browser
  never leaves the origin.
- 70 - e2e: after signing in, one Back lands on wherever the visitor was before `/login`, not
  on a filled-in login card.
- 71, 129, 131 - e2e: after sign-in, the typed email, the typed password and the derived secret
  appear in none of `location.href`, `document.title`, `JSON.stringify(history.state)`,
  `document.documentElement.outerHTML`, or any storage entry - asserted both as whole values and
  as twelve-character windows (section 9). The credentials the spec types are high-entropy for
  that reason.
- 72, 76 - e2e: after sign-in, `sessionStorage.length === 1`, and the single stored value
  parses to exactly two keys, `version` and `userId`; the stored bytes contain neither the
  email, the password nor the secret in full, and no twelve-character window of any of them.
  The window half is what catches a truncated-prefix leak; the whole-value half is what catches
  a verbatim one. Neither is "no substring", which is unsatisfiable - a `version: 1` collides
  with a password of `1` - and the entry says so, because the previous wording would have been
  silently narrowed to the whole-value check by whoever wrote the test.
- 73, 74, 83 - **e2e, not review.** All three are observable in Playwright against current
  Chromium and were wrongly classified as browser semantics nobody can drive:
  - 73 - sign in, then `browser.newContext()` and open the app: the new tab starts signed out
    and its `sessionStorage` is empty. A reload of the original tab keeps it signed in.
  - 74 - from the signed-in tab, `window.open(location.href)` and wait for the popup: the
    opener-created tab inherits a copy of the record and is treated as a valid session, which
    is the behaviour the invariant records as intended rather than as a defect.
  - 83 - with two independent signed-in contexts, sign out in one and assert the other still
    holds its record and still renders the authenticated view.
  What remains review-carried is only the *reason* (tab-scoping is the storage's own semantics,
  not something this app implements), plus the mechanical half already named: the code writes
  only `sessionStorage`, through one lint-overridden file, and `localStorage.length === 0` after
  every e2e flow.
- 75 - e2e: `localStorage.length === 0` and `indexedDB.databases()` empty after a full sign-in
  and sign-out; the existing assertion at `e2e/telemetry-buffer.spec.ts:44-50` is extended
  rather than replaced, with the `sessionStorage` half narrowed to "empty before sign-in, one
  entry after".
- 77 - unit, three cases against a fake storage: unparseable JSON, a record missing `userId`,
  and a record whose version is 2. Each asserts signed-out, the key removed, and exactly one
  `warn` record carrying a reason literal and no stored bytes. Plus a component test that the
  login card renders normally in each case.
- 78 - unit: a storage whose property access throws and one whose `read` throws both produce
  signed-out with no exception escaping.
- 79 - unit: a storage whose `write` returns `false` still leaves `readSession` returning the
  record (the shadow), emits one `warn`, and the sign-in still navigates. A second test
  asserts a fresh runtime does not see the shadow, which is what proves "a reload signs the
  user out".
- 79a - unit, the two stale-storage cases, each of which a storage-first read gets wrong:
  (i) a storage pre-loaded with a **valid record for user A**, then a `writeSession` for user B
  whose `write` returns `false`; `readSession` must return **B**, not A. This is the
  wrong-identity case and it is the one that matters most - a fallback-shaped shadow silently
  authenticates the previous user. (ii) a storage holding a valid record whose `remove` fails
  (throws, or leaves the value in place); after `clearSession`, `readSession` must return signed
  out, and a guard run against that storage must redirect to `/login` rather than back inside.
  Each asserts exactly one `warn`. A third case pins the boundary the shadow must not cross: a
  **fresh** storage instance (a new runtime, standing in for a reload) sees whatever storage
  actually holds, so invariant 79's honest consequence survives.
- 80 - e2e: reload an authenticated view; the same route re-renders and no `/login` entry
  appears in the navigation log.
- 81 - review for this phase (the tree is phase 3); the mechanical half is that nothing under
  `features/hierarchy` reads the session, asserted by a grep.
- 82 - unit: no timer is scheduled by any session function, asserted with a fake clock that
  reports zero pending timers.

### The guard (84-93)

- 84, 85, 86 - e2e: request `/` with no session; assert the URL becomes `/login?from=%2F`,
  assert from the request log that no request to the API origin was made, and assert the
  hierarchy heading was **never inserted into the document** - by a `MutationObserver` installed
  through `page.addInitScript` before the navigation, which records every added element for the
  life of the page and is then read after the redirect settles. The originally proposed check (a
  `domcontentloaded` snapshot plus a later `toHaveCount(0)`) samples two discrete moments and is
  blind to anything inserted and removed between them, so it could not decide "not even for a
  frame" at all. The observer decides DOM insertion; a composited frame with no DOM change is
  outside any in-page instrument, so invariant 86 also sits in the partially-review-dependent
  list with the structural argument (section 5.3) named as the covered half. A second case
  covers a guarded URL carrying a search string, asserting `from=%2F%3Fa%3D1` round-trips; **no
  case asserts a fragment**, because invariant 84 does not promise one.
- 87 - e2e, **two variants**, because one unconditional redirect action passes one and fails the
  other:
  - *current-entry:* `page.goto(startPage)`, then `page.goto('/')` (a document load, so the
    guarded URL is already the current entry), then Back - the visitor lands on the start page,
    not on the guarded URL, and not on whatever preceded the start page.
  - *push:* from the not-found route, click the home link (`e2e/not-found.spec.ts:18-24`'s
    existing in-app push to `/`), then Back - the visitor lands back on the not-found route. A
    `replace()` applied here would have overwritten the not-found entry, so Back would leave the
    app entirely; that is the failure this variant exists to catch, and it is reachable from the
    suite that already exists.
  Both assert the navigation log holds no entry for the guarded URL.
- 88, 89 - e2e, four entry paths: typed URL, a `Link` navigation, a Back onto `/login`, and the
  guard's own redirect landing on a `/login` that has since acquired a session. Each asserts
  the form is never painted.
- 90, 137 - e2e: an unknown path renders not-found signed-in and signed-out alike, with no
  redirect, and the not-found route's own content is unchanged from phase 1's assertions
  (heading, copy, home link). Its home link is asserted **per session state**, because the
  destination legitimately differs: signed in it reaches the hierarchy placeholder, signed out
  it reaches the login card, which is the guard working rather than not-found changing.
  `e2e/not-found.spec.ts:18-24` is rewritten in M3 to assert both rather than the single
  `home.title` it asserts today.
- 91 - e2e: `/login` with no session renders the card with no redirect, from every entry path.
- 93 - e2e: `?from=/login` with a session lands on `/` and stops; a signed-out visit to `/`
  lands on `/login` and stops. The navigation log is asserted to hold at most two entries in
  each case.
- 127 - e2e: after a guarded redirect, the buffer holds exactly one `app.route_viewed` and its
  `routeId` is the login route's.

### The header and signing out (94-104)

- 94, 96 - component + e2e: the header's parts in order; the avatar rendering initials derived
  from the resolved name and carrying no image element.
- 95 - e2e: no header on `/login` and none on the not-found route, in both session states.
- 97, 97d - e2e: exactly one request to `/users/<id>.json` **after** the authentication window
  closes, and no request to `/users.json` or any other collection form at any point. This is the
  other side of the 13/14/128 entry: that one asserts nothing on the users path *inside* the
  window, this one asserts exactly one single-record request *outside* it, and the two together
  are the whole network contract. Plus a unit assertion that the path is
  `encodeURIComponent`-encoded (invariant 18a), so an id that somehow reached this far cannot
  address another resource.
- 97a - unit: `signedInUserSchema` fed a fixture containing a `password` field produces a value
  whose serialisation contains neither the key nor the value, at any depth; plus a component
  test asserting the rendered DOM and the buffer contain neither.
- 97b - e2e: navigate between two authenticated routes (the hierarchy route and a reload-free
  re-entry) and assert exactly one user request; then reload and assert a second.
- 97c - component, five cases (network, timeout, 500, malformed body, `null` record): each
  leaves the user signed in, renders no error page, renders the page beneath, produces no
  `role="alert"`, and emits exactly one `warn`.
- 97e - live only, in the same `scripts/live-smoke/live-smoke.test.ts` case as 6/6a and
  immediately after it: fetch `/users/<the resolved id>.json`, run the real `signedInUserSchema`
  over the response, and assert the display name the header would render is a non-empty string.
  This is the only check in the phase that can fail when the live payload's field names differ
  from what the implementation guessed - every gating header check feeds a mocked record, so
  without it an implementation shows the neutral fallback to every real visitor with a fully
  green suite. It never gates, and it fails with the keys it actually found rather than with a
  bare assertion, because `docs/reference.md:13` records those names as unconfirmed.
- 98 - component: the logout control is present and operable in all three name presentations,
  including before the promise settles.
- 99 - component: the name position's bounding box is identical in all three presentations
  (asserted through the shared `sizeClass` entry rather than through layout, since jsdom has
  none), the skeleton container carries `aria-busy` **while pending and not after**, and the
  failed presentation carries no alert. Plus the distinction the presentations must not lose:
  the pending avatar is the kit `Skeleton` and carries `animate-pulse`; the **failed** avatar is
  `SignedInAvatarPlaceholder` and carries **no** animation class, asserted directly, because
  reusing the skeleton would render a permanently pulsing "still loading" circle in a terminal
  state and would leave the settled avatar `aria-hidden` with nothing else in its place. The
  layout half is e2e, measuring the box before and after resolution, in both the resolved and
  the failed outcome.
- 100 - component: the page beneath renders while the promise is pending.
- 101, 112, 113 - e2e, and invariant 113 is the **whole** flow with no pointer, not its tail.
  The spec starts on the login card and uses the keyboard only: Tab to the email field, type,
  Tab, type the password, submit with **Enter from inside the field**, assert the authenticated
  view rendered (which is the outcome half - "hear the outcome" is not asserted by arriving at a
  page nobody checked), then Tab to the logout control and activate it with Enter; a second run
  activates it with Space. A visible focus indicator with a non-zero outline width is asserted at
  each stop. The previous mapping started at the authenticated page body and exercised only
  logout, which left the invariant's first and larger half - reaching and completing a login
  without a pointer - unasserted.
- 102 - e2e: signing out removes the storage entry, lands on `/login` in its idle state with
  both fields empty, and shows no confirmation of any kind.
- 103 - e2e for the ordinary path (Back and Forward after sign-out both re-run the guard and
  land on `/login`, with the mutation observer of the 84/85/86 entry asserting the authenticated
  content was never re-inserted); unit for the bfcache path (a synthetic `pageshow` with
  `persisted: true` calls `router.revalidate()`, and a revalidation with no session throws the
  redirect). What the pair proves is that the guard runs and the visitor does not stay on an
  authenticated view - **not** that nothing authenticated is visible in between, which is why
  invariant 103 is worded as it is. Chromium's bfcache is not reliably triggerable from
  Playwright and `vite preview` sets no headers that would make it deterministic, so the restore
  itself is not driven in this suite; the uncovered half is named in the review-dependent list
  rather than implied by the unit test.
- 104 - unit + e2e: `clearSession` on a storage with no entry throws nothing; signing out twice
  lands on `/login` both times.

### Keyboard, accessibility, i18n (105-120)

- 105, 110 - component: a full Tab sweep in each of the five states, asserting the exact order
  per state - **email, password** in idle, where invariant 35's disabled Login control is absent
  from the tab order entirely and the sweep asserts that absence rather than expecting it third;
  email, password, Login in ready/submitting/no-match, where the control is enabled (submitting
  keeps it focusable per invariant 44, which is why it stays in the sweep while busy); **retry,
  email, password, Login** in the service-problem state, which is the order the alert's DOM
  position produces
  (invariant 24) and the order invariant 105 now states. The sweep also asserts no element in the
  card carries a `tabindex` attribute at all, which is what makes reading order, visual order and
  tab order the same order rather than three that happen to agree today. Plus
  `document.activeElement !== document.body` after every transition in every state, with the
  retry handoff asserted specifically under invariant 60.
- 106 - component: `getByLabelText('login.emailLabel')` resolves the input, and the
  placeholder key is asserted not to be the accessible name.
- 111 - e2e: axe over each of the five card states and over the header, in both
  `colorScheme: 'light'` and `'dark'`, zero violations.
- 115 - component: the control's text changes and `aria-busy` is set, asserted independently of
  the spinner element.
- 116 - lint: `i18next/no-literal-string` (`eslint.config.js:196-220`) plus a demonstrable
  negative - a hardcoded label added to `LoginPage`, lint captured, reverted.
- 117 - build output: `build-output/catalogue-chunks.test.ts:32-37` continues to assert
  `LoginRoute.tsx` dynamically imports the auth catalogue and only that; a new assertion adds
  the mirror for the authenticated route chunk.
- 118 - the whole component and e2e suite, which asserts keys rather than prose under
  `Locale.Test`; plus `vitest.setup.ts:17-23`'s empty-`missingKeyReports` assertion, which
  fails the suite if any rendered surface asks for a key the catalogue does not have.
- 119 - review: this phase renders no number, date or list. The `toLocale*` lint ban already
  installed covers the mechanical half.
- 120 - e2e in the existing `right-to-left` project, using
  `e2e/support/forceDirection.ts:14-31`: the card and the header at RTL with no horizontal
  overflow and a mirrored inline-start indicator; plus `assert-no-physical-properties.mjs`
  inside `npm run lint`.

### Telemetry and security (121-135)

- 121 - e2e: the buffer holds one `auth.sign_in_started` and one `auth.sign_in_settled` per
  attempt, sharing a correlation id, with the settled event's outcome one of the three
  declared values - one flow per outcome.
- 122 - unit + e2e: a no-match produces zero `error`-level records and no
  `app.error_boundary_shown`.
- 123 - e2e: the service-problem flow produces exactly one `error` record whose correlation id
  equals the one rendered in the alert.
- 124 - component: a cancelled attempt produces no `auth.sign_in_settled` and no `error` record.
- 125 - unit + e2e, both halves named because neither alone discriminates. Unit: `redact`
  applied to a timing record whose `resourcePath` is `/secrets/<64 hex>.json` returns
  `/secrets/[redacted].json`, and the same for the cancellation and invalid-path log records.
  E2E: after a real sign-in, `JSON.stringify(buffer)` contains the typed email, the typed
  password and the derived secret **neither in full nor as any twelve-character window** - the
  window loop of section 9, which is what catches a truncated secret prefix that a whole-value
  check would let through. This replaces `e2e/telemetry-buffer.spec.ts:26`'s pattern match,
  since the scrubbed path legitimately contains the word `secrets` and would fail the old regex
  while being correct. The residue - a leak shorter than twelve characters - is named in the
  review-dependent list; it is not claimed here.
- 126 - e2e: signing out emits exactly one `auth.signed_out` with a correlation id and no other
  payload key.
- 130 - component + e2e. Component: submitting a failing attempt calls the injected `navigate`
  **zero** times (section 1.2 makes navigation a spy-able dependency rather than a router
  effect), and `location.href` is unchanged with no query string appended. E2E: the same across
  a real submit in the browser, which is where a GET form submission would actually manifest.
  The mechanism (React 19 form actions calling `preventDefault` on the submit event) is stated
  and is review-carried; the assertion is on the effect.
- 132, 133 - review + decision log. Both are statements about what the design does and does not
  guarantee; the mechanical parts are invariants 125, 128, 129 and 131.
- 134 - unit: `scripts/repository-configuration.test.ts:343-361` unchanged and still green -
  the seven-name list is not edited by this phase.
- 135 - unit + e2e: `scripts/buildContentSecurityPolicy.test.ts` unchanged; the e2e asserts the
  meta tag's content is byte-identical to phase 1's and that no inline `style` attribute
  appears in any of the five states.

### What must not change (136-146)

- 136 - unit: a test enumerating the router's path patterns asserts exactly `/`, `login`,
  `*` (plus `__kit` in development), so a pathless layout route cannot be mistaken for a new
  path.
- 138 - e2e: the buffer contains no `app.error_boundary_shown` on any of the five states,
  including both failure paths.
- 139 - unit: a test asserting the three phase-1 analytics keys and their payload shapes are
  present and unchanged, so this phase's additions cannot become edits.
- 140 - e2e: the console recorder asserts an empty collection on every new spec, in the
  production preview and in the `development` project.
- 141 - review, with **all four** findings this spec raises named explicitly so a reviewer
  decides them rather than discovering them: `Input.readOnly`, `Input.placeholder`, `Button`'s
  busy spinner and pressed busy fill, and the `redact` path-segment rule. The third was missing
  from an earlier draft of this list while invariants 30, 41 and 115 all depended on it, which is
  exactly the "slipped in" shape invariant 141 exists to prevent. The kit state inventory
  (`src/app/testing/kitStates.tsx`) gains one state per kit change, so the reviewer sees them
  rendered. Mechanically supported by invariant 142's scan and by the contrast sweep over the new
  states.
- 142 - lint + script: `scripts/assert-domain-vocabulary.mjs:16-26` continues to fail any
  domain word in a `shared` or `platform` export; the two new `Input` props are primitives.
- 143 - unit: `HierarchyPlaceholderPage.tsx` is byte-unchanged, asserted by its **own component
  test** rendering it in isolation and by `git diff --exit-code` over
  `src/features/hierarchy/**` in the milestone evidence. Explicitly **not** asserted by "the
  existing placeholder tests still passing untouched": `e2e/placeholder-routes.spec.ts` is one of
  those tests, it visits `/` unauthenticated, and M3's guard means it cannot pass untouched. A
  check whose premise the same milestone invalidates is worse than no check, because it reads as
  coverage.
- 144 - CI: `npm run size` with the login route's entry unchanged at 30 kB, plus the new
  entry-chunk assertion of section 1.1 proving the table is not in the entry.
- 145 - unit: `scripts/workflow-configuration.test.ts` unchanged and still asserting no
  `continue-on-error`; the coverage thresholds in `vitest.config.ts:63-73` unchanged.
- 146 - review, with one mechanical half. Review: no check distinguishes an unused abstraction
  from a necessary seam, and `withSessionGuard` is the one thing in this phase with no phase-2
  caller. Invariant 146 now carries it as its single named exception rather than being
  contradicted by it, so the reviewer's question is whether the exception's reason holds (a
  parallel-loader property of the router that makes invariant 85 accidental today), not whether
  the spec noticed the conflict. Mechanical: the structural test of section 5.3 asserts every
  route object beneath the authenticated layout has either no loader or one produced by
  `withSessionGuard`, which is what makes the seam load-bearing rather than decorative - it fails
  the moment phase 3 adds a loader without it.

### Invariants that are review-dependent

This list is meant to be exhaustive and honest, and it is the thing a reviewer should check
first, because an invariant that is quietly missing from it is one nobody is holding. Two entries
were wrong in an earlier draft and are corrected here: 73/74/83 were listed as fully
review-dependent although all three are drivable in Playwright, and 76/86/125 were absent
although none of them is fully decided by a check.

Fully: 21 (the lookup's side-effect freedom), 36 (a recorded trade-off, not a behaviour), 81
(until phase 3 exists), 119 (nothing formatted this phase), 132, 133 (statements about the
design's limits), 141, 146.

Partially, with the covered and uncovered halves named:

- 6 - the live suite proves the derivation against whichever account the database serves. It
  proves nothing when the database is down or its shape changes, and it does not gate. That is
  the invariant's own design (6a), not a gap in the check.
- 7 - the transcription is proven byte-for-byte against the brief's own evaluated source, so
  "matches the brief" is covered. That the brief's algorithm is what the **real database's**
  secrets were built with is not provable from here at all; invariant 6a's live proof is the
  only evidence, and it exercises ASCII credentials, so the astral path specifically rests on the
  transcription being faithful rather than on the database agreeing.
- 12 - the substring assertions cover every observable surface, and the post-unmount check covers
  the lifetime claim. A value held in a closure that never reaches an observable surface is not
  detectable by any test; the module shape is review-carried.
- 73, 74, 83 - the behaviours are e2e (see the map). What is review-carried is the *reason* -
  that tab scoping is `sessionStorage`'s own semantics rather than something this app implements
  - and therefore that the observed behaviour will hold in browsers the suite does not run.
- 76, 125 - the whole-value and twelve-character-window assertions are mechanical, and the
  redaction rule is unit-tested. Two halves are not covered: a leaked fragment **shorter than
  twelve characters** (unassertable without false positives against ordinary JSON), and a secret
  reaching a sink through a code path that bypasses `dispatch` - `createObservability.ts:32-44`
  is the structural reason none exists, and that reason is a review claim.
- 86 - covered mechanically for DOM insertion by the pre-installed `MutationObserver`, and
  structurally by react-router not constructing a route until its loaders settle plus
  `HydrateFallback: () => null`. Not covered: an actual composited frame with no DOM change,
  which no in-page instrument can observe. The structural argument is the real guarantee and it
  is a review claim.
- 103 - the ordinary Back/Forward path is e2e. The bfcache path is unit-tested at the listener
  only; the restore itself is not reproducible in Playwright (see Risks), and the interval
  between restore and redirect - during which authenticated content can be on screen - is
  uncovered by construction, which is why the invariant is worded as it is.
- 128 - the request log is the assertion. A request made from an origin Playwright's route
  handler does not see (there is none) would be missed.
- 130 - the effect is asserted (no navigation, no query string, unchanged `location.href`). That
  React 19 form actions call `preventDefault` on the submit event, rather than this phase
  arranging it, is the mechanism and is review-carried.

## Risks and mitigations

- **Invariant 125 is not satisfiable without changing a platform module, and this spec proposes
  the change.** As established in Context and section 3, `redact.ts:32, 43-59` scrubs keys and
  URL search parameters and would let `/secrets/<SECRET>.json` through verbatim on every timing
  record. The path-segment rule is the fix; the alternative (a `telemetryResourcePath` field on
  `HttpRequest`) changes the http client's public surface and fails open. Either way invariant
  141 is engaged, so this is raised now rather than at review, with the decision-log entry
  landing in M1.
- **The kit cannot express three things six invariants require.** `readOnly` (invariants 41,
  114), `placeholder` (invariant 106) and a busy spinner with a pressed busy fill (invariants 30,
  41, 115) do not exist on `src/shared/ui/Input.tsx:5-37` and `src/shared/ui/Button.tsx:19-53`,
  and there is no `Spinner` in the kit at all. The proposal is two optional primitive props on
  `Input` and a widened rendering for `Button`'s existing `busy` prop. The cost is a kit-surface
  change in a phase whose invariant 141 says not to make one; the mitigation is that all three
  are additive, none carries a domain type (invariant 142 holds), and the kit's state inventory
  grows by one state per change so a reviewer sees them rendered. The `Button` change was missing
  from an earlier draft of this spec while three invariants silently depended on it - the exact
  failure mode invariant 141 exists to catch, recorded here rather than quietly fixed.
- **A guard on a parent route does not stop a child's loader.** React Router runs matched
  loaders in parallel. Invariant 85 passes in phase 2 only because the hierarchy route has no
  loader; phase 3's would start before the parent's redirect landed. `withSessionGuard` plus
  the structural test of section 5.3 is the mitigation. It is the one piece of this phase built
  for a caller that does not exist yet, and invariant 146 now carries it as an explicit named
  exception with its reason rather than being contradicted by it.
- **The back-forward cache path of invariant 103 cannot be proven in this suite, and the
  invariant is worded to match.** Chromium's bfcache is not reliably triggerable from Playwright,
  and `vite preview` does not serve the headers that would make it deterministic. Worse than
  untestable, the mechanism is *inherently partial*: `pageshow` fires after the browser has
  restored the document, so revalidation cannot prevent a restored authenticated frame from being
  visible - it can only end it. Invariant 103 therefore promises that no Back or Forward leaves
  the visitor on an authenticated view, not that none is ever rendered, and the residue is in the
  review-dependent list. The listener is unit-tested; the browser behaviour is not. The same
  listener pattern covers the login card's restored-submitting case (invariant 48a), which *is*
  component-testable through a synthetic `pageshow`.
- **React 19 resets a form after an action.** React 19 form actions call `form.reset()` on
  uncontrolled forms after the action settles. Invariants 42, 53 and 62 all require the typed
  values to survive, including the password. Controlled inputs make the reset a no-op because
  the next render restores the state's value, which is why section 7 specifies controlled
  inputs rather than leaving it to taste - and the component test asserting byte-identical
  values after a no-match is what would catch a later switch to uncontrolled.
- **`useActionState` queues a second dispatch rather than dropping it, and a flag inside the
  action cannot stop it.** Invariant 43 says "no second derivation and no second request", which
  queuing violates. The queued node runs from `onActionSuccess` **after** the first action
  resolves (`react-dom-client.development.js:8434-8446`), by which time any in-flight ref the
  first action set has been cleared in its own `finally` - so the ref-flag mitigation an earlier
  draft proposed is a no-op. The working mitigation is to stop the dispatch: an `onSubmit`
  handler calling `preventDefault()` while pending, which React's form-action listener honours
  (`react-dom-client.development.js:19061-19064`, and that listener is queued after the ordinary
  `onSubmit` listeners at line 19759). `useActionState` stays as ARCHITECTURE.md's named
  primitive; no `useTransition` fallback is needed. What discriminates in test is the pair of
  "exactly one `auth.sign_in_started`" and "exactly one transport call", since a call count alone
  cannot tell a suppressed second attempt from a second attempt whose request was dropped
  downstream.
- **Tree-shaking is load-bearing for the entry budget.** `routeDefinitions.ts` sits in the
  entry and will import the guards through `features/auth`'s barrel, which makes the 256-entry
  table reachable from the entry chunk. `"sideEffects": false` plus the entry-chunk absence
  assertion of section 1.1 turn this from an assumption into a check; the fallback is a
  narrower app-layer wrapper. The entry measured 112.77 kB against a 150 kB budget at the end
  of phase 1, so a failure here is a correctness problem before it is a budget problem.
- **Three phase-1 guards must be narrowed, narrowing is where enforcement quietly disappears,
  and two of the three are harder to narrow than they look.** The `sessionStorage` ban
  (`eslint.config.js:35-43, 86-99`), the `redirect`/`redirectDocument` import ban and the
  `/secrets` literal ban (`scripts/assert-domain-vocabulary.mjs:159-161`) all exist to stop phase
  2's work from starting early, and all three now have to move. Two traps, both of which would
  produce a narrowing that does not narrow:
  - the import ban lives in **two** ESLint blocks (`eslint.config.js:549-571` and `570-591`), and
    the second - scoped to `src/features/*/**` - is the effective one for the guard files. Fixing
    only the first leaves every guard failing lint;
  - the `/secrets` ban is **not** governed by `FILE_ALLOWLIST`, which is read only by
    `checkExportedVocabulary` (lines 113-135). The literal test is unconditional inside
    `checkWholeScopeVocabulary` (lines 138-161), so an allow-list entry has no effect at all and
    the file still fails. A new path allow-list consulted by that function is required.
  Each ban is narrowed to a named file or directory rather than removed, each keeps its assertion
  in `scripts/eslint-configuration.test.ts` and `scripts/guard-scripts.test.ts` updated in the
  same change, and each gets a demonstrable-negative capture in M1 proving the rule still fires
  for every other file. A wholesale removal of any of the three would pass CI and lose the
  guarantee silently.
- **The guard invalidates seven existing e2e specs, and one of them fails after merge rather
  than at a boundary.** Guarding `/` breaks every spec that visits it unauthenticated; they are
  enumerated in M3's deliverables and migrate in that milestone. `e2e/deployed-smoke.spec.ts` is
  the dangerous one: it runs only in the post-merge `deployed` project, so a forgotten migration
  surfaces as a red deployment gate rather than as a red milestone. It also asserts phase 1's
  literal placeholder prose on both `/` and `/login`, both of which this phase replaces.
- **`e2e/telemetry-buffer.spec.ts:26`'s assertion becomes wrong rather than merely
  insufficient.** After the redaction change the buffer legitimately contains
  `/secrets/[redacted].json`, which matches `/password|secret|token/i`. Replacing the pattern
  match with the substring assertion of invariant 125 is not optional cleanup - the old
  assertion would fail on a correct implementation, and "fixing" it by loosening the regex
  would give up the only mechanical check invariant 125 has.
- **The e2e route handler aborts every cross-origin request.** `e2e/support/routeMocks.ts:13-28`
  aborts anything not same-origin, which includes the API. Every phase-2 spec must register its
  API mock **after** `installRouteMocks`, because Playwright matches handlers most-recent-first
  - the pattern `e2e/error-boundary.spec.ts:16-23` already relies on. A spec that registers in
  the other order fails with an aborted request rather than a wrong assertion, which is at
  least loud.
- **The live proof depends on the public payload's field names, which nothing has confirmed.**
  `docs/reference.md:13` records that the `users` record's field names are unconfirmed, and
  phase 1's live smoke printed them without asserting on them. The invariant 6a proof reads an
  email and a password out of that payload at run time, so it will fail if the field names
  differ from what the implementation guesses. Mitigation: the live case reads the printed
  names from phase 1's captured evidence first, and it fails with a message naming the keys it
  found rather than a generic assertion failure. It never gates.
- **Invariant 99's "reserves its final width and height" cannot be proven in jsdom.** jsdom
  applies no stylesheet and reports zero-sized boxes. The component half asserts the shared
  `sizeClass` entry is used for both the skeleton and the resolved avatar, which is a proxy;
  the real measurement is e2e, comparing bounding boxes before and after resolution. Both halves
  are specified because neither alone distinguishes a reserved box from a coincidentally equal
  one.
- **Nothing in PRODUCT.md is infeasible against this codebase.** Five things are more expensive
  than they read, and all five are named above: invariant 125 (a platform change), invariants
  30/41/106/114/115 (three kit changes), invariant 103's bfcache clause (not provable here, and
  inherently partial), invariant 85's forward compatibility (a seam with no caller this phase),
  and the seven e2e migrations the guard forces. Invariant 111's "every state of the card, and
  the header, in both themes" is the largest single block of e2e work in the phase - five card
  states plus three header presentations, doubled for `colorScheme` - and it is worth budgeting
  for as such rather than discovering at M4.

## Decision-log entries this phase records in ARCHITECTURE.md

**Status: written.** All nine entries are in ARCHITECTURE.md's decision log, and the two
statements this phase contradicted were amended in the same pass (§3's `null -> summary alert`,
§4's split between the password and the derived secret). This section is no longer a to-do list;
it is the mechanism-and-milestone index of what those entries cover, which is what makes each one
checkable against the code when the milestone that implements it lands. Where an entry describes
work that has not happened yet - the redaction rule, the three guard narrowings, the kit changes -
the entry records the decision and the milestone column below records where it is implemented.

PRODUCT.md's "Deviations that need a decision-log entry" is the behavioural statement of this
list; this is the same list with the mechanism, the file and the milestone. ARCHITECTURE.md is
binding, so until the implementing milestones land the
repository carries two contradictory contracts - that is the defect, not the deviations
themselves. **This spec does not edit ARCHITECTURE.md**; the driving session does, in the change
that lands the code.

1. **The null lookup produces a summary-only alert, not a field-level error.** Amends
   ARCHITECTURE.md §3's runtime-flow line "null -> field-level error"; `Field`'s `error` prop is
   deliberately unused (section 7). Lands in M2.
2. **"Secrets and passwords never enter URLs" amended to what is guaranteed.** Amends
   ARCHITECTURE.md §4's security posture; the mechanism is `secretResourcePath` (section 3).
   Lands in M1.
3. **The header presents three states, not four.** Departs from ARCHITECTURE.md §4's "four states
   everywhere data is involved"; the mechanism is `SignedInName` (section 6). Lands in M4.
4. **The email is trimmed before the ported algorithm sees it.** Departs from the brief;
   `deriveSecret` vs `docs/task.md:47-49` (section 2). Lands in M1.
5. **The derivation is transcribed byte-exact including its Unicode defect.**
   `normalizeToCodeUnits` and `deriveSecret`'s 0-to-31 loop (section 2). Lands in M1.
6. **Invariant 146 gains one named exception, `withSessionGuard`.** `guard/withSessionGuard.ts`
   plus its structural test (section 5.3). Lands in M3.
7. **The redaction layer gains a path-segment rule.** Widens ARCHITECTURE.md §4's "scrubs
   `password`, `secret` and `token` keys"; the mechanism is `redact.ts` (section 3). Lands in M1.
8. **`sessionStorage` is unbanned in exactly one file.** An `eslint.config.js` block for
   `createTabStorage.ts`, with `scripts/eslint-configuration.test.ts:52-95` updated. Lands in M1.
9. **The `/secrets` literal ban and the `redirect` import ban are narrowed, not removed.**
   `checkWholeScopeVocabulary` gains its own path allow-list; **both** ESLint blocks
   (`eslint.config.js:549-571` and `570-591`) are narrowed. Lands in M1 (script) and M3
   (imports).
10. **Three additive kit changes.** `Input.readOnly`, `Input.placeholder` and `Button`'s busy
    spinner, with `kitStates.tsx` growing one state each (section 7). Lands in M2.
11. **A user id is restricted to a conservative charset at the parse boundary.**
    `lookupResultSchema`, `sessionRecordSchema` and `userResourcePath` (section 3). Lands in M1.
12. **`package.json` gains `"sideEffects": false`.** A build-configuration change that enables
    the entry-chunk tree-shake of section 1.1. Lands in M1.

**Also for the driving session, and deliberately not done here:**

- `VERIFICATION.md` needs no edit for the entry budget. It was reported as still carrying the
  obsolete 100 kB figure; it does not - lines 85-90 state **150 kB**, explain the revision, and
  name `.size-limit.json` as the authority. The only occurrence of "100 kB" in the file is inside
  the sentence saying it is *not* that number. Nothing to fix.
- `VERIFICATION.md` **does** need the phase-2 e2e specs added to its suite inventory once they
  exist (`login.spec.ts`, `guard.spec.ts`, `header.spec.ts`), which is ordinary bookkeeping
  rather than a correction.
- `ROADMAP.md` is edited by this loop per PRODUCT.md's open question 5; that edit is already in
  the working tree and is outside this spec.
