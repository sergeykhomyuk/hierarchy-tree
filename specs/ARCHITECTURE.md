# Architecture

Technical decisions behind [GOAL.md](./GOAL.md). High level by design: it states what exists and why, not how each file is written. Implementation detail belongs to task decomposition.

## 1. Context and constraints

- The backend is fixed and cannot be changed: a public Firebase REST database with a flat `users` collection and a `secrets` map of secret to user id. There is no session endpoint, no pagination, no filtering.
- The dataset is small (33 users, ~9KB) and the payload is public, including plaintext passwords.
- Client-only static hosting. There is no server we own, so anything a backend would normally do is either mitigated in the client or documented as a gap.
- The app must stay small enough to read in one sitting while still carrying the concerns a production app carries: observability, i18n, accessibility, resilience, testing, budgets.

The guiding rule: **the brief bounds the features, not the engineering.** Nothing is built that GOAL.md does not ask for; the depth goes into how the requested behavior is built.

## 2. System overview

Four layers with one-directional imports. Features never reach into each other, and the platform never knows what a "user" is.

```mermaid
graph TD
    app["app<br/>router, providers, boundaries"]
    auth["features/auth<br/>login, session, guard"]
    hierarchy["features/hierarchy<br/>tree domain, tree UI"]
    shared["shared<br/>UI primitives, hooks, test utils"]
    platform["platform<br/>http, config, observability, i18n"]

    app --> auth
    app --> hierarchy
    auth --> shared
    auth --> platform
    hierarchy --> shared
    hierarchy --> platform
    shared --> platform
    auth -. forbidden .-> hierarchy
```

- `app` owns composition: the router, the provider stack, the root error boundary. It is the only place that knows the full feature set.
- `features/*` own a slice end to end - route module, data access, domain logic, components - and expose a single public entry. Everything else is internal.
- `shared` holds framework-level building blocks with no domain knowledge.
- `platform` holds adapters to the outside world: HTTP, configuration, logging/tracing/analytics, i18n. Swappable without touching features.

The rules are enforced, not documented: `eslint-plugin-boundaries` plus `no-restricted-imports` fail CI on a cross-feature or deep import.

Routing runs in React Router library mode (`createBrowserRouter`) so Vite stays the only build tool and the output remains static files. Route modules are lazily imported, which makes the route boundary the code-splitting boundary.

## 3. Runtime flow

```mermaid
sequenceDiagram
    participant U as User
    participant R as Router
    participant A as auth
    participant H as http
    participant F as Firebase

    U->>A: submit email + password (useActionState)
    A->>A: encode(email, password) -> secret
    A->>H: GET /secrets/{secret}.json
    H->>F: fetch (traceparent, timeout, retry)
    F-->>A: userId | null
    A->>A: null -> field-level error, stay on /login
    A->>R: persist session, navigate to `from` or /
    R->>H: hierarchy loader starts users fetch (not awaited)
    R->>U: route renders, Suspense shows skeleton
    H-->>R: validated users
    R->>U: use(promise) resolves, forest renders
```

Two properties matter here. The loader starts the request at navigation time, so there is no render-then-fetch waterfall. And the login lookup fetches only `/secrets/{secret}.json` - the app never downloads the password table to authenticate.

## 4. Cross-cutting concerns

### Data access

A single `http` client owns every network call: base URL from config, `AbortController` timeout, one bounded exponential-backoff-with-jitter retry for idempotent GETs only (never on 4xx), trace header propagation, and timing telemetry. Its transport is injected, which is what makes component tests possible without a mock server.

Above it, a repository per resource maps raw JSON to domain types. The router's loader starts the request at navigation time and the component reads the returned promise with `use()`, so a resource has exactly one fetch site.

There is no response cache in this roadmap. Request dedupe, TTL and stale-while-revalidate are **withdrawn, not deferred** - they are outside this roadmap entirely, and reinstating them is a new decision-log entry rather than scheduled work (see the decision log). Each navigation that needs the users payload fetches it, which at 33 users and ~9KB is a request the app can afford, and the repository is the seam a cache attaches to when one is worth its complexity.

No data-fetching library. React 19 primitives (`use`, Suspense, transitions, `useActionState`) plus the router's loader/action lifecycle cover what this app needs.

### Domain model

Tree construction is pure, framework-free, and the most heavily tested code in the repo:

- `buildForest(users)` - O(n) grouping by `managerId`. Users with no manager, a dangling `managerId`, or a cycle become roots; cycles are broken and reported to telemetry rather than hanging the render.
- `flattenVisible(forest, expandedIds)` - produces the visible row list with `depth`, `hasChildren`, `isExpanded`, `setSize`, `posInSet`. This shape serves the ARIA attributes, the render, and any future virtualizer.

The UI renders that row list with memoized rows keyed by user id. Nothing in the domain layer imports React.

### Validation and error taxonomy

Zod schemas validate at the API boundary. Parsing is tolerant per row: an invalid user is dropped and counted in telemetry instead of failing the page, because a shared public database can change under us. Ids and emails are branded types, so a raw number cannot be passed where a user id is expected.

Failures are a small typed union - `NetworkError`, `TimeoutError`, `HttpError(status)`, `ParseError` - mapped once in the http client. The UI has four states everywhere data is involved: skeleton, error with a retry that re-runs the loader, empty, and data.

### Accessibility

The tree implements the full WAI-ARIA tree pattern, not a nested list with buttons: `role=tree` / `treeitem` / `group`, roving tabindex so the whole tree is one tab stop, arrow keys to move and expand/collapse, Home/End, type-ahead, and `aria-expanded` / `aria-level` / `aria-setsize` / `aria-posinset` from the flattened row model. Expand/collapse changes are announced through a live region.

Beyond the widget: visible focus rings, `prefers-reduced-motion` respected, color contrast held to WCAG AA in both themes, avatars carrying meaningful alternatives and falling back to initials. `jsx-a11y` lints the markup, axe-core asserts on rendered components in unit tests, and `@axe-core/playwright` asserts on real pages in e2e - the a11y claim is enforced in CI rather than asserted in a README.

### Internationalization

i18next with a namespace per feature, lazy-loaded with the route. Every user-visible string lives in a catalogue; `eslint-plugin-i18next` fails the build on hardcoded literals. Dates, numbers, names and lists format through `Intl`, never string concatenation.

English ships alone, but the pipeline is exercised end to end so a second locale is a content change, not a refactor. Layout uses logical properties (`padding-inline-start` for tree indentation, `text-start`, `ms-*`/`ps-*` utilities) throughout, so an RTL locale needs a catalogue and a `dir` switch, nothing more.

### Observability

One facade in `platform/observability` exposing three narrow interfaces - logger, tracer, analytics - over swappable sinks: console in development, an in-memory ring buffer in production builds, no-op in tests unless asserted on. A vendor SDK is a one-line sink swap.

- Every request gets a W3C `traceparent`; the same correlation id appears on the request log, on any error the boundary reports, and on the analytics event for that interaction.
- Analytics events are a typed union with a documented catalogue, so event names are refactorable and cannot drift.
- Web Vitals (LCP, INP, CLS) are collected through the `web-vitals` package and reported through the same facade. This reverses an earlier "no dependency" position; see the decision log.
- A redaction layer scrubs `password`, `secret` and `token` keys before anything reaches a sink.

E2E asserts against the buffer sink, which makes the telemetry contract a tested behavior rather than decoration.

### Performance and budgets

- Route-level code splitting; the login route never pays for the tree route.
- The forest is built once per payload and memoized; toggling a node recomputes only the visible row list.
- Rows are memoized components keyed by id. Virtualization is deliberately not shipped for 33 rows, but `flattenVisible` already produces exactly what a windowing layer consumes - the seam is named and the threshold documented (~500 visible rows).
- Avatars are lazily loaded with explicit dimensions to avoid layout shift, and fall back to initials on error.
- Budgets are numbers in the repo, checked by `size-limit` in CI: app entry and per-route chunk ceilings in gzipped kB. Field targets: LCP under 1.5s and INP under 200ms on a mid-tier device.

### Security posture

The constraint is that client-side auth is not authentication. What we control, we do:

- Only `/secrets/{secret}.json` is fetched at login; the users table with its plaintext passwords is never pulled for authentication.
- Secrets and passwords never enter URLs, logs, telemetry or storage. The session record holds a user id and a schema version, in `sessionStorage`, scoped to the tab.
- A CSP meta tag constrains sources; third-party avatar URLs load with `referrerpolicy="no-referrer"`. The meta tag carries no `frame-ancestors` directive, because browsers ignore it there. Framing protection needs a response header, and Cloudflare Pages sets one from a `_headers` file in the build output. See the decision log.
- Route guards run in loaders (redirect with a `from` param), not in render, so an unauthenticated user never triggers a data fetch.

The gap is stated plainly in the code and in this document: a real deployment puts a BFF in front of this, which performs the lookup server-side and issues an httpOnly session cookie. The auth module isolates that seam so replacing it touches one file.

### UI and UX

Tailwind v4 with a CSS-first theme, so design tokens - color, spacing, type scale, radii, motion - are declared once and consumed as utilities. Dark mode via `prefers-color-scheme`, layout responsive from 320px up with container queries on tree rows so deep nesting stays usable on narrow screens.

Expand/collapse state lives in a URL search param: the view is shareable, the back button works, and a refresh preserves the shape of the tree. On first paint, roots and their first level are expanded so the org shape is immediately legible.

## 5. Quality pipeline

- **Types**: TypeScript strict, no `any`, no non-null assertions; type-aware ESLint rules (`recommendedTypeChecked`) so lint sees types.
- **Lint**: ESLint owns correctness and architecture - boundaries, `jsx-a11y`, `react-hooks`, `i18next` literals, testing-library and Playwright hygiene. Prettier owns formatting, with Tailwind class sorting; `eslint-config-prettier` keeps them from overlapping.
- **Unit and component**: Vitest with jsdom and Testing Library. The pure domain is held at ~100%; components are tested by behavior and keyboard contract, with axe assertions. Component tests inject a fake transport fed from the same fixtures the e2e mocks serve.
- **E2E**: Playwright with `route()` mocks by default - deterministic, offline-capable, and able to exercise failure paths (500, timeout, empty payload, malformed row, cycle) that a live API will not produce on demand. A separate script runs smoke tests against the real database to catch contract drift; it never gates the default suite.
- **CI**: one GitHub Actions workflow on PR and main - typecheck, lint and format check, unit tests with coverage thresholds, build, size budgets, e2e with report artifact. A manually triggered job runs the live smoke tests.
- **Deploy**: main deploys to Cloudflare Pages from the same workflow, after every gate has passed, so review starts with a URL rather than an install.
- **Config**: a single typed module reads `import.meta.env` once, validates at startup, and exposes environment-shaped defaults (API base URL, log level, sink, feature flags). No `import.meta.env` reads scattered through the code.

## 6. Decision log

Each entry: the choice, why, and what was rejected.

- **React Router library mode over framework mode** - keeps Vite the only build tool and the output static, which matches the hosting constraint. Framework mode brings routing machinery, typegen and a server story this app never uses.
- **Loader starts the fetch, `use()` suspends, over a blocking loader** - removes the render-then-fetch waterfall while keeping granular skeletons. A blocking loader is simpler but gives up streaming; pure Suspense without loaders reintroduces the waterfall.
- **No response cache in this roadmap** (2026-08-13, phase 1) - the earlier position was an own cache module over TanStack Query, on the grounds that dedupe, TTL and stale-while-revalidate are small enough to own. Specifying it proved otherwise: the state machine, per-key generations, revalidation cooldowns and their tests were the largest single piece of the phase 1 spec, and it exists to save one 9KB request on a dataset of 33 users. The cache is withdrawn from the roadmap, not designed and deferred - phases 1 to 3 ship without it and the repository per resource is the seam it attaches to afterwards. Rejected: TanStack Query, which is the same weight bought rather than written; and keeping the module in phase 3, which would land a cache and the tree domain in one loop. The withdrawn design is kept whole in [CACHE.md](./CACHE.md), including the ten review findings it absorbed, so reinstating it is a decision rather than a rewrite.
- **Zod at the boundary over hand-written guards** - the schemas are the parsing rules, the types, and the documentation in one place, and per-row `safeParse` gives tolerant parsing cheaply. Hand-written guards avoid a dependency but drift from the types they protect.
- **Feature-sliced with lint-enforced boundaries over layer-by-type** - a feature's code stays in one place, and the boundary is a CI failure rather than a convention. Rejected a workspaces monorepo as tooling cost out of proportion to the app.
- **Full ARIA tree widget over nested lists with disclosure buttons** - the brief describes a tree; the accessible tree has a defined keyboard contract, and claiming the role without the contract is worse than not claiming it. The list version is simpler but turns 33 users into 33 tab stops.
- **`sessionStorage` user id over in-memory or `localStorage`** - survives reload, dies with the tab, and stores nothing sensitive. In-memory reads as a bug on refresh; `localStorage` widens exposure of something standing in for a credential.
- **Playwright route mocks over a shared mock server** - one browser-level mocking mechanism, no extra dependency, and full control over failure injection. Live coverage is preserved through a separate, explicitly run smoke suite.
- **Tailwind v4 over CSS Modules with tokens** - the theme layer gives a real token system and the utility layer keeps styling decisions visible in the component, with class ordering enforced by Prettier.
- **English-only i18n with full infrastructure** - the pipeline is what is expensive to retrofit; a second catalogue is not. Shipping a token second locale would prove less than exercising the real one.
- **`web-vitals` as a dependency over hand-rolled `PerformanceObserver` collection** (2026-08-13, phase 1) - INP is a high percentile of interaction latencies under a specific windowing rule, and CLS is a session-window maximum. `PerformanceObserver` cheaply yields a maximum interaction latency and a running shift sum, which are different numbers. Reporting those under the labels `INP` and `CLS` would make the telemetry lie about what it measures, and the facade's whole point is that the contract is tested rather than asserted. Rejected: shipping the approximations under honest alternative names, which keeps the dependency count at zero but leaves the app with no comparable field metric; and dropping INP and CLS entirely, which gives up the interaction budget the performance section commits to. The cost is one small runtime dependency inside the entry budget.
- **No `frame-ancestors` in the CSP meta tag; the response header instead** (2026-08-13, phase 1) - browsers ignore `frame-ancestors` when it arrives in a meta tag and log a warning saying so, so including it would buy no protection while producing a permanent console warning, forcing an allow-list entry into the e2e console assertion that otherwise stays empty. Rejected: keeping the directive in the meta tag as a statement of intent. Framing protection therefore ships as a response header, which Cloudflare Pages sets from a `_headers` file in the build output - the one thing the previous hosting choice could not do. Everything else stays in the meta tag, so there is one policy to read rather than two half-policies.
- **Cloudflare Pages over GitHub Pages** (2026-08-13, phase 1) - the repository is private, and GitHub Pages does not serve a site from a private repository on this account's plan, so the hosting decision had to be remade rather than debated. Cloudflare Pages serves the site at the root (no project sub-path, so the Vite `base` stays `/`), gives SPA deep links through a `_redirects` rule instead of a `404.html` copy, and sets response headers from `_headers`, which is what makes framing protection possible at all. Deployment stays inside the same GitHub Actions workflow, running `wrangler pages deploy` after every gate has passed, so the rule that a deploy follows a green pipeline is unchanged. Rejected: Cloudflare's own Git integration, which builds and deploys on push without waiting for the workflow's gates, giving up exactly that property; and making the repository public to keep Pages, which is not a hosting decision.
- **App entry budget of 100 kB gzipped** (2026-08-13, phase 1) - set against an estimate of 85-90 kB for the fixed dependency set (react-dom, react-router, zod, i18next, react-i18next, web-vitals), leaving roughly 10-15% headroom. Rejected: 75 kB, which the dependency set alone would likely bust, turning the budget into noise the first time it ran; and deferring the number until measured, which leaves CI with no size gate while the skeleton is built. Per-route chunks stay at 30 kB.
- **Two design tokens darkened past their mockup literals: `border-field` and `ink-faint`** (2026-08-13, phase 1) - `docs/reference.md`'s pulled values (`#E2DDEE` field border, `#8E8AA0` faint ink) hold 1.33:1 and 3.34:1/4.31:1 (light/dark) against the surfaces they sit on, both short of invariant 72's AA floor (3:1 for UI boundaries, 4.5:1 for body text - the correlation id `ErrorState` renders in `ink-faint`, per invariant 92, is body text). `theme.css` re-declares both tokens (`border-field` `#8F89A3`, `ink-faint` `#726E85` light / `#847F95` dark) with `contrastPairs.test.ts` entries proving the new values clear AA in both themes. Rejected: keeping the mockup literals and accepting the AA failure, which invariant 70's mockup-fidelity goal does not outrank invariant 72's binding accessibility floor; and reusing an existing darker token (`ink-muted`) for the correlation id instead of darkening `ink-faint`, which would collapse two intentionally distinct text weights into one.

## 7. Deliberately not built

Named so the omissions read as decisions, with the seam that makes each cheap later:

- **Virtualized rendering** - unnecessary at 33 rows; `flattenVisible` already emits the row model a windowing layer needs.
- **Real auth** - impossible against this API from a static client; `features/auth` isolates the lookup so a BFF-issued cookie replaces one module.
- **Offline / service worker** - a 9KB public payload does not justify a cache lifecycle; the repository layer is where a persistent cache would attach.
- **Response caching** - dedupe, TTL and stale-while-revalidate, withdrawn from the roadmap by the decision log entry above; the design is preserved in [CACHE.md](./CACHE.md). The repository per resource is the seam: caching attaches behind it without a caller changing.
- **Search, filtering, org editing** - outside GOAL.md. The tree domain is pure and already returns the row model a filter would narrow.
- **A second locale, SSR, a component library** - infrastructure supports each; none is needed to satisfy the goal.
- **Vendor telemetry** - the facade defines the contract; a real sink is a swap, not a rewrite.
