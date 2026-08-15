# Tech spec: phase-3-tree - the hierarchy tree page

Written against `PRODUCT.md`, which owns behavior. Invariants are referenced by number here
because this document is written after PRODUCT.md is frozen; PRODUCT.md's own internal
cross-references are by description, for the reason its header gives.

**Baseline.** This loop branched from `main` (`6511fb1`, phase 1 merged). Phase 2 is in
flight on `loop/feature/phase-2-login` and every code reference marked *(phase 2)* describes
that branch, not `main`. Nothing here may be implemented until phase 2 merges and this branch
rebases onto it; the specs are written now precisely so the wait is not idle.

## Context

### Where the route lives today

`src/app/routing/routeDefinitions.ts` composes the route tree. On `main` the index route is a
bare lazy component; phase 2 wraps it in a pathless `authenticated` layout route whose loader
is `createAuthenticatedLoader` (`src/app/layout/createAuthenticatedLoader.ts`):

```
/ (ApplicationLayout, RouteErrorBoundary)
├── id: 'authenticated'  → AuthenticatedLayout + createAuthenticatedLoader
│   └── index            → HomeRoute (currently HierarchyPlaceholderPage)
├── login                → redirectSignedInVisitor + LoginRoute
├── __kit                (development only)
└── *                    → NotFoundRoute
```

`createAuthenticatedLoader` calls `requireSession` (`src/features/auth/guard/requireSession.ts`),
which either throws a redirect to `/login?from=…` or returns `{ userId }`. It returns
`{ signedInUser: Promise<SignedInUserView | null> }` - an object *holding* a promise, never a
bare promise, so react-router does not block the navigation on it. This phase's loader follows
the same rule.

`HomeRoute.tsx` re-exports the hierarchy feature's public entry. The lazy route awaits
`loadTranslations(i18n)` before resolving, so the namespace is registered before render.

### The pieces this phase consumes unchanged

- **HTTP** (`src/platform/http/`). `HttpClient.request<Value>({ method, resourcePath, parse })`
  returns `HttpResult<Value>` = `success | failure | **cancelled**`; `HttpFailure` is
  `network | timeout | http(status) | parse`. The client owns the timeout, the single bounded
  GET retry, the `traceparent` and the timing record.
- **Correlation ids.** `createInteractionTracker` (`src/app/routing/createInteractionTracker.ts`)
  opens an interaction per navigation and exposes `currentCorrelationId()`,
  `beginInteraction()` and `endInteraction()` - the last two added by phase 2 for
  interactions that are not navigations. `createRuntime.ts:54-56` wires the client's
  `correlationId` to `currentCorrelationId() ?? createCorrelationId(randomness)`. Phase 2's
  `lookupUserIdentifier` establishes the pattern this phase reuses: the *caller* passes the
  id in and the failure result carries it back out, because `HttpResult` does not expose it.
- **i18n**, **observability's three interfaces**, **Vitest** (`ui` project matches
  `src/{app,features,shared}/**`; coverage already pins `src/features/*/domain/**` to 100%),
  **Playwright** with `route()` mocks against the built `dist/`.
- **Dependency injection.** Phase 2's `LoginPage` takes a `dependencies` object assembled by
  its route module (`LoginRoute.tsx`), because `eslint.config.js` forbids `feature → app` and
  therefore `useRuntime`. This phase uses the same channel - it is the only legal one
  (invariant 193).

### What this phase has to change, and why each is unavoidable

1. **`AuthenticatedLoaderData` gains `userId`** *(phase 2 file)*. Invariant 84 needs the id to
   mark one row, and the loader is where `requireSession` already produces it.
2. **`AuthenticatedLayout` renders the nav rail** *(phase 2 file)*. Invariant 92 puts the rail
   in the authenticated shell. These are **two** phase-2 surfaces, not the one an earlier
   draft claimed.
3. **`img-src`** at `scripts/buildContentSecurityPolicy.ts:16` is `'self' data:` and blocks
   every photo (invariant 172).
4. **`scripts/assert-domain-vocabulary.mjs`** bans the identifiers `buildForest` and
   `flattenVisible` anywhere in `src` (`:29-34`) and fails on any `role="tree"` attribute
   (`:163-164`); `scripts/guard-scripts.test.ts:43-59` pins that behavior. These tripwires
   exist to stop phase 1 anticipating phase 3. `npm run lint` - inside `npm run verify` -
   fails on this phase's first domain file until they are retired (invariant 194).
5. **`AnalyticsPayloads`** (`src/platform/observability/analyticsEvents.ts:3-7`) is a closed
   map in `platform`, which may not learn what a manager is - and the vocabulary guard bans
   `manager`/`hierarchy`/`tree`/`report` in exported `platform` identifiers anyway
   (invariant 168).
6. **The UI kit** cannot render either non-data state as drawn: `ErrorState.tsx:7` takes one
   optional action and no glyph, `EmptyState.tsx` likewise, and both render their own card
   frame - so composing them inside the page's `Card` nests two frames. `Avatar.tsx:27,39`
   owns its `onError` and exposes no callback, so per-row photo telemetry has no seam
   (invariant 190). `Avatar` already sets `referrerPolicy="no-referrer"`, so invariant 99 is
   satisfied by the kit as it stands.

## Proposed changes

### Layer placement

`features/hierarchy` owns the slice end to end behind `index.ts`. It may not import
`features/auth` and may not import `app`. `app` composes: the loader, the signed-in id, the
dependency object, and the nav rail.

### 1. The domain (`src/features/hierarchy/domain/`)

Pure, synchronous, React-free. Nothing here logs: anomalies are returned as data and reported
by the caller (invariant 7).

- `personIdentifier.ts` - branded `PersonIdentifier` over `number` and its parser.
- `emailAddress.ts` - branded `EmailAddress` over `string` and its parser, so invariant 52's
  "or a raw string" half is real rather than aspirational.
- `person.ts` - `Person = { id, firstName, lastName, email, managerId?, photo? }`.
- `treeNode.ts` - `TreeNode = { person, children: readonly TreeNode[] }`.
- `forestAnomaly.ts` - counts for `duplicateId`, `danglingManager`, `selfManaged`,
  `cycleBroken`, `skippedExpansionSegment`. Counts only; never a person's data.
- `buildForest.ts` → `{ roots, anomalies, counts }` where `counts` is
  `{ people, managers, roots }` computed from the forest **after** duplicate removal, which
  is what makes invariant 82 true. One pass indexing `id → person` (first wins), one pass
  grouping children in payload order, then an iterative colour-marked walk (white/grey/black)
  for cycle detection - never recursion, so invariant 14 holds structurally. Linear
  (invariant 25).
- `flattenVisible.ts` → `readonly VisibleRow[]`, an iterative pre-order walk with an explicit
  stack. `VisibleRow` carries `person`, `depth`, `hasChildren`, `isExpanded`, `setSize`,
  `posInSet`, `reportCount` (invariants 27-40).
- `defaultExpansion.ts` → roots plus roots' children that have children (invariants 87-88).
- `expansionParameter.ts` - `parseExpansion(raw, forest)` and `formatExpansion(ids)`.
  **Total by construction** (invariants 118-121): split on commas, trim, skip empties, skip
  anything that is not a safe positive integer, skip ids naming no manager, dedupe, and
  return the surviving set plus a skipped count. `null` (absent) and `''` (present, empty)
  are distinct inputs with distinct results. There is no "malformed parameter" branch,
  because a per-segment parser cannot have one.

**Naming.** The two banned identifiers keep their names and the guard is narrowed instead:
they are the domain's vocabulary, `ARCHITECTURE.md` §4 names both, and renaming would not
help the third violation (`role="tree"`) anyway.

### 2. The boundary (`src/features/hierarchy/data/`)

- `personSchema.ts` - Zod object; `id`, `firstName`, `lastName`, `email` required,
  `managerId` and `photo` optional. Zod strips everything else, `password` included.
- `parsePeople.ts` - `parsePeople(payload) → { people, dropped } | 'invalidEnvelope'`.
  Envelope normalization first (invariants 42-44): an array has its `null` holes **removed
  before validation**, because Firebase leaves a hole at a deleted index while the collection
  is still dense enough to serialize as an array - counting those holes as malformed rows
  would emit drop telemetry every time somebody deletes a person; a non-null object is taken
  as its values in own-key order; `null` is an empty list; anything else - a string, a
  number, a boolean - is `invalidEnvelope`. Then per-element `safeParse`, collecting counts
  and failing field paths but never values (invariant 53).
- `usersResourcePath.ts` - the `'/users.json'` literal, in one place, tested.
- `fetchPeople.ts` - the repository:

```ts
type HierarchyResult =
  | { kind: 'data'; roots; anomalies; counts; dropped }
  | { kind: 'empty' }
  | { kind: 'failure'; failure: HttpFailure['kind'] | 'allRowsInvalid'; correlationId: string }
  | { kind: 'cancelled' };
```

It never rejects and never throws, which is what makes invariant 74 true. `allRowsInvalid`
implements invariant 49. The repository calls `buildForest` and reports anomalies, drops and
the hierarchy-viewed event.

**Cancellation is wired, and its reach is stated honestly.** The loader forwards
`LoaderFunctionArgs.request.signal` into `HttpRequest.signal` (`src/platform/http/httpRequest.ts:8`
is the seam; `createHttpClient.ts:84-86` merges it with the deadline controller through
`AbortSignal.any`), so a request that is aborted does stop.

What that does **not** buy is cancellation on a superseded navigation. Because the loader
returns an object holding a promise, it resolves synchronously, `completeNavigation` runs, and
`router.js:559` clears `pendingNavigationController` **without aborting** - so a later
navigation finds nothing to abort and the in-flight users request runs to completion. The
consequences are named rather than papered over: a double-click produces a second request
whose result is discarded by React, not by the router, and both requests emit their own
telemetry, which the exact-buffer assertions must expect. `cancelled` is therefore reachable
in a unit test with a pre-aborted signal and not through a Playwright navigation, so no
milestone boundary claims otherwise. The branch exists so the type is total and so a future
caller cannot silently map it onto `failure` and render "Couldn't load the hierarchy" at a
user who clicked twice.

### 3. Route wiring (`src/app/`)

- `createAuthenticatedLoader` returns `userId` alongside `signedInUser`.
- `HomeRoute.tsx` stops being a bare re-export: it becomes the route module that assembles
  the feature's `dependencies` object (`observability`, `clock`), the `userId`, and the
  `onRetry` / `onRefresh` callbacks, and renders `HierarchyPage`. `routeDefinitions` registers
  `createHierarchyLoader` and the `shouldRevalidate` predicate. **The rewrite splits across
  two milestones**, because M2's boundary keeps phase 1's placeholder on screen: M2 registers
  the loader and the predicate and lands the tracker change, leaving `HomeRoute` still
  rendering the placeholder; M3 turns it into the module that assembles the dependencies, the
  retry and refresh wrappers, and renders `HierarchyPage`.
- **`Runtime` exposes its `clock`.** `createRuntime` builds one (`createSystemClock()`) but
  keeps it local, so the composition layer cannot pass it down today. Adding it to the frozen
  runtime object is one of the app-layer surfaces invariant 190 enumerates, alongside the
  tracker change, the home-route rewrite and the lint rule - and, separately, the two phase-2
  files.
- The loader returns `{ hierarchy: Promise<HierarchyResult> }` and reads
  `interactionTracker.currentCorrelationId()` for the id it hands to `fetchPeople`.
- **`shouldRevalidate` on both the `authenticated` route and the index route.** Without it
  react-router revalidates every
  loader on every toggle (`router.js:1965` sets `defaultShouldRevalidate` when
  `currentUrl.search !== nextUrl.search`), which would refetch the payload, rebuild the
  forest, hand `use()` a new promise, and delay the row change until the navigation settled -
  falsifying invariants 111, 112, 124 and 176 at once.

  **The predicate must be written defensively, and this is the exact rule:** compute the set
  of search parameters whose values differ between the current and next URL; return `false`
  only when that set is **non-empty** and every member of it is `expanded`; otherwise return
  `defaultShouldRevalidate`. The non-empty clause is load-bearing. On
  `router.revalidate()` the two URLs are identical, so the difference set is empty, and the
  natural-looking `differences.every(name => name === 'expanded')` is **vacuously true** -
  which would return `false` and silently no-op every revalidation, because
  `shouldRevalidateLoader` (`router.js:2065-2071`) lets a route's predicate override
  `defaultShouldRevalidate` even when `isRevalidationRequired` is set. That single mistake
  would break Retry (invariants 70-72) and Refresh (invariant 79).

  **The same predicate goes on both the `authenticated` route and the index route.** An
  earlier draft scoped it to the index route alone, out of a concern that a predicate on
  `authenticated` would disable phase 2's `createBackForwardRestore`
  (`src/app/routing/createBackForwardRestore.ts:18`), which calls `router.revalidate()` on a
  persisted `pageshow` so `requireSession` re-runs after a bfcache restore. The non-empty
  clause above already removes that danger: a bfcache revalidation has identical URLs, so the
  difference set is empty, the predicate returns `defaultShouldRevalidate`, and the guard runs.

  Scoping it to one route is not merely unnecessary, it is wrong. If `authenticated` still
  revalidates on a toggle, that navigation has a loader to run, so react-router does not take
  its no-loader short-circuit (`router.js:693`), the navigation enters its loading state, the
  interaction tracker opens an interaction and emits an `app.route_viewed` - one per toggle,
  falsifying invariant 161 and re-minting a correlation id for a interaction that made no
  request. Covering both routes leaves the toggle with no loader to run at all, which is what
  makes invariant 161 true. The `authenticated` loader is cheap either way; correctness, not
  cost, is the reason.
- **Retry and Refresh** use `useRevalidator()` **in the route module, not in the feature**,
  wrapped so that `interactionTracker.beginInteraction()` is called immediately before
  `revalidate()` and `endInteraction()` when it settles. `router.revalidate()` leaves
  `navigation.state` at `idle` (`router.js:655`), and the tracker only mints an id on a
  non-idle navigation, so without this the retry reuses the failed attempt's correlation id
  and invariant 72 is false. The feature receives the wrapped function as an `onRetry` prop
  (and the empty state's `onRefresh`); `useRevalidator` is added to the feature layer's
  `no-restricted-imports` list so "the feature never revalidates directly" is enforced rather
  than asked for - without that rule a `useRevalidator()` call inside the feature would
  compile, work, and quietly lose the new correlation id.

  **The tracker needs one adjustment for this to be clean.** `router.revalidate()` first
  publishes `{ revalidation: 'loading' }` while `navigation.state` is still `idle`
  (`router.js:476`). The tracker's subscriber reads that as "not navigating" while an
  interaction is open and calls `settle()`, which emits a spurious `app.route_viewed` for a
  retry and closes the interaction before the request starts. `createInteractionTracker`
  therefore learns to ignore a revalidation-only state change, an app-layer change listed with
  the others in invariant 190.

  **The rule must be stated precisely, because a loose reading admits two behaviours.** The
  tracker's `RouterState` type (`createInteractionTracker.ts:4-8`) gains a `revalidation`
  field, and an update is ignored when `navigation.state` is unchanged **and** `revalidation`
  changed. Comparing anything wider - the same update also moves `loaderData`, `location`,
  `matches` and `historyAction` - would let the revalidation's completion settle the
  interaction and emit one route-viewed per retry, the exact behaviour this change exists to
  prevent. The consequence is that **a retry emits no route-viewed event at all**, only its
  hierarchy-viewed event, and the e2e assertion states that positively rather than leaving it
  implied.

  **One hazard this creates, named now rather than discovered later:** with the spurious
  settle gone, an interaction opened by Retry stays open until it completes, so a navigation
  started while a retry is still in flight - "Back to login" on a slow retry - would inherit
  the retry's correlation id instead of minting its own. The wrapper therefore calls
  `endInteraction()` when it unmounts as well as when the revalidation settles, which is what
  that method exists for (`createInteractionTracker.ts:24-30`).

  Rejected alternative: driving Retry with `navigate(location, { replace: true })`, which
  would mint the id through the ordinary navigation path and need no tracker change - not
  taken because it depends on react-router's same-URL navigation behaviour, which this spec
  has not verified, where the tracker change is explicit and directly testable.
- `NavigationRail.tsx` in `src/app/layout/`, rendered by `AuthenticatedLayout`, `aria-hidden`,
  no focusable content (invariant 92).

### 4. The page (`src/features/hierarchy/`)

- `HierarchyPage.tsx` - reads the loader promise with `use()` and switches on
  `HierarchyResult.kind`. It holds no previous result and needs none: a superseded navigation
  never commits, so `cancelled` reaches no render (invariant 57), and the branch exists for
  totality. Wrapped by the route component in `<Suspense fallback={<HierarchySkeleton />}>`.
  Its props are `userId`, `onRetry`, `onRefresh` and the `dependencies` the widget itself
  needs - `observability` and `clock`. The HTTP client is **not** among them: `fetchPeople`
  is called by the loader in the app layer, and handing the page a client would invite exactly
  the render-then-fetch waterfall invariant 58 forbids.
- `HierarchySkeleton.tsx`, `HierarchySummary.tsx`, `HierarchyTree.tsx`, `TreeRow.tsx`,
  `TreeToggle.tsx`, `useExpansion.ts`, `useTreeKeyboard.ts`, `announceExpansion.ts`.
- **`useExpansion`** wraps `useSearchParams`, reading through `parseExpansion` and writing
  through `formatExpansion` with `setSearchParams(next)` - push by default, which is
  invariant 122 - preserving every other parameter (invariant 127).
- **`TreeRow` memoization** (invariant 91): `flattenVisible` returns fresh objects every
  recompute, so a `memo` comparing a `VisibleRow` prop would re-render all 33 rows on every
  toggle - the opposite of the claim. The row therefore receives **primitives** (`personId`,
  `firstName`, `lastName`, `email`, `photo`, `depth`, `isExpanded`, `hasChildren`,
  `reportCount`, `setSize`, `posInSet`, `isSignedInUser`) plus a toggle callback made stable
  with `useCallback` over a ref, and the row calls it with its own id.
- **`TreeToggle`** is a `<button>` carrying `tabIndex={-1}` (invariant 107). No automated
  check catches a nested tab stop here - `treeitem` has no `childrenPresentational` in
  axe-core's role table - so a test asserts the tab sequence directly.
- **Accessible names** (invariant 94): each row carries an explicit `aria-label` built from
  the catalogue, so the computed name is not the concatenation of the person, the email, the
  count and the toggle glyph. Type-ahead matches that same string (invariant 138).
- **The type-ahead timer** uses the injected `Clock`, not `setTimeout`, which
  `eslint.config.js:30-34,616-621` bans across `src` with no feature override.

### 5. ARIA structure

Flat `role="treeitem"` elements under one `role="tree"`, each with `aria-level`,
`aria-posinset`, `aria-setsize` and - managers only - `aria-expanded`, from `VisibleRow`.
Deviation from `ARCHITECTURE.md` §4's `role=group`, recorded (PRODUCT deviation 4).

### 6. Shared-surface changes

Each is generic, carries a decision-log entry, and is listed in invariant 190:

- `ErrorState`: optional `secondaryAction`, optional `glyph`, optional `framed` (default
  `true`) so the page can compose it inside its own `Card` without nesting two frames.
- `EmptyState`: optional `glyph`, same `framed`.
- `Avatar`: optional `onImageError` callback, fired once per failed source.
- `AnalyticsPayloads` becomes an `interface` (from a `type`) that a feature augments by
  declaration merging, so the event names and payload types live in `features/hierarchy` and
  `platform` stays ignorant of the domain. `AnalyticsEventName = keyof AnalyticsPayloads`
  survives the change unaltered. **The augmentation must target the module that declares the
  interface** - `@platform/observability/analyticsEvents` - not the `@platform/observability`
  barrel: `observabilityFacade.ts` imports the interface from the declaring module, so
  augmenting a re-exporting barrel merges nothing the facade can see. The declaring module is
  therefore given a stable public path, and the feature declares its events against it.
- `buildContentSecurityPolicy.ts`: `img-src 'self' data: https:`.
- `assert-domain-vocabulary.mjs` and `guard-scripts.test.ts`: the phase-1 anticipation
  tripwires (`buildForest`, `flattenVisible`, `role="tree"`) are removed; every other banned
  word stays, including the `platform`/`shared` export bans and the `/secrets` literal check.

## Milestone split (proposed)

Sequential. Five milestones, re-cut after the G1 grill showed the earlier six had forward
dependencies: expansion cannot be split from toggling without a second copy of the state that
this spec forbids, so the URL work joins the page rather than following it.

Invariants 1-5 are scope statements and belong to no milestone by design. Every other
invariant has one **owning** milestone - the one whose boundary must demonstrate it - with
exactly four deliberate exceptions, listed here rather than left to be discovered:

- **118-121** (the expansion grammar) are written and unit-tested as pure functions in M1,
  and wired to the URL in M3.
- **45 and 49** are owned by M2 as *repository outcomes* (the right `HierarchyResult.kind`)
  and by M3 as *rendered states*. M2's boundary proves the kind; it cannot prove the render,
  because no error state exists until M3.
- **114 and 115** describe behaviour reachable from both the mouse and the keyboard. M3
  proves the mouse path; M4 re-asserts both for the keyboard path. Neither milestone can
  claim them alone. (**142** is M4's alone: it is a statement about the keyboard sharing the
  mouse's implementation, and there is no mouse half to prove separately.)
- **161** is written in M2, where the events are emitted, but its toggle clauses cannot be
  exercised until toggles exist, so M3's boundary is where "one hierarchy-viewed event, one
  toggle event, and no additional route-viewed event" is actually asserted.
- **194** (no check disabled, tripwires retired deliberately) is executed in M1, because
  nothing after it can go green otherwise, and re-checked in M5 against the finished
  pipeline. M5's range below excludes it to keep this honest.

Three telemetry and privacy invariants that an earlier cut put in M2 are owned later,
because M2's code cannot exercise them: **166** (photo failure reported without its URL)
needs the row and the avatar callback, so it is M3's; **167** (no event carries a name, an
email or a photo URL) ranges over M3's toggle event and M4's `*` event, so it is verified in
M5 across the finished event set; and **169** (the e2e suite asserts events against the
buffer sink) is M5's for the same reason.

**M1 - The tree domain, and the tripwires that block it.** Both branded types, `person`,
`treeNode`, `forestAnomaly`, `buildForest`, `flattenVisible`, `defaultExpansion`,
`expansionParameter`, the fixture set, and the guard-script retirement (which must land here
or nothing after it can go green). Invariants 6-40, 118-121, 194. Boundary: `npm run verify`
green with `src/features/hierarchy/domain/**` at 100%.

**M2 - The boundary, the repository and the loader.** Schema, envelope normalization,
`parsePeople`, `fetchPeople`, the loader factory, `shouldRevalidate`, the `userId` addition,
the runtime's clock, the analytics-map change, the interaction-tracker change, cancellation
wiring, and the telemetry this milestone's own code emits. Invariants 41-57, 160-165, 168,
170, 173-174. Boundary: suite green; e2e route-mocking every envelope and outcome shape that a
browser can actually produce - dense array, array with a `null` hole, object map, `null`, a
scalar, 500, all-rows-invalid - and asserting the telemetry buffer, **with the page still
rendering phase 1's placeholder**. The `cancelled` outcome is a unit case with a pre-aborted
signal, not an e2e case: as established above, a superseded navigation does not abort this
loader's request, so no Playwright flow can produce it. This milestone owns the *result kind*
the repository returns, not the state that renders it.

**M3 - The page: four states, the tree, and expansion.** Skeleton, empty, error, summary,
tree, row, toggle, nav rail, `useExpansion`, the CSP widening, the kit changes, the
catalogue, and the second half of the home-route rewrite - dependency assembly plus the retry
and refresh wrappers. Mouse-operable. Invariants 58-97, 99-129 (mouse path for 114-115), 153-159, 166,
171-172, 179-182, plus the rendered halves of 45 and 49 and the toggle assertion for 161.
Boundary: suite green; e2e over all four states, a photo failing and falling back to initials,
retry with a fresh correlation id, refresh/shared-link/back/forward for expansion, and the
exact telemetry buffer after a toggle sequence; screenshots per state.

**M4 - The keyboard and the ARIA contract.** `useTreeKeyboard`, roving tabindex, focus
recovery after a POP, the live region, axe over components and pages. Invariants 130-152,
plus the keyboard path of 114-115. Boundary: suite green; e2e driving the tree by keyboard
alone, key by key; axe clean on all four states.

**M5 - Closing.** README, the eight decision-log entries, the roadmap update, budgets, the
chunk-graph assertion, console cleanliness, the finished-event-set privacy check, phase 2's
suite and e2e flows re-run unchanged, and the one check no automated run makes:
**invariant 98's mixed-content block, verified by hand against the deployed origin** with the
screenshot stored under `evidence/`. Automating it would require a real account's password in
CI for a single assertion, which invariant 51 rules out; the user's decision is recorded in
that invariant. `npm run e2e:deployed` still runs post-merge for the existing smoke coverage.
Invariants 98, 167, 169, 175-178, 183-193, 195-196. Boundary:
`npm run verify` and `npm run e2e` green, size budgets inside their ceilings, and the deployed
run green post-merge.

## Testing and validation

Per `VERIFICATION.md`: `npm run verify`, `npm run e2e` against the built artifact, evidence
copied into `specs/phase-3-tree/evidence/` as `.txt`.

**Unit, pure (100% floor)** - invariants 6-40 table-driven against fixtures: multiple roots, a
single person, an empty list, a dangling manager, a self-manager, a two-ring, a three-ring, a
ring of everyone, duplicate ids, a duplicate where the first copy is invalid (invariant 16),
and a 33-person fixture mirroring the live shape. Determinism (13) by building twice and
comparing; termination (14) by running the ring fixtures at all; linearity (25) by counting
instrumented operations across sizes, not by timing. Invariants 118-121 test `parseExpansion`
against whitespace, empty segments, signs, decimals, exponents, unsafe integers, unknown ids,
non-manager ids, duplicates, and the mixed valid/invalid case.

**Unit, boundary** - invariants 41-57: a dense array, an array carrying a `null` hole (which
must produce no drop), an object-keyed map, `null`, and each invalid primitive envelope in
turn (string, number, boolean → `invalidEnvelope`); each required field missing; each
optional field mistyped; an `id` that is negative, fractional or beyond the safe integer
range; `password` absent from the parsed object; all-invalid → `failure`; and `cancelled`
propagated as its own kind. The `shouldRevalidate` predicate is tested directly as a pure
function of two URLs, including the identical-URL case that must return `defaultShouldRevalidate`
rather than `false`.

**Component (jsdom + Testing Library + axe)** - invariants 58-129 and 130-152. The keyboard
contract is driven with `user-event`, one test per key and per edge, focus asserted by
accessible name. Named discriminating checks, rather than a range claim: render counters
across two roots for 91; a request counter plus a `buildForest` spy across a toggle sequence
for 112; **collapsing and re-expanding a branch three times and asserting one photo-failure
event for that person** for 97 - the remount case, not just a repeated error on one instance -
**and a second resolved payload asserting the report fires again**, since the page does not
remount across a revalidation and the dedupe set has to be keyed to the payload's identity;
the tab sequence for 107 and 130-132; a POP that removes the focused row for 144; a second `*`
on the same row asserting no history entry and no event for 141.

**Layout assertions do not belong in jsdom** and are not written there: `getBoundingClientRect()`
returns all-zero rects and there is no scrolling, so invariant 64's frame stability, invariant
113's scroll retention and invariant 104's three widths would all pass without measuring
anything. All three are Playwright assertions, in M3, alongside the per-state screenshots.

**E2E (Playwright, route mocks)** - the four states, every envelope and outcome shape, a
photo failing and falling back to initials, retry with a distinct correlation id,
refresh/link/back/forward, a keyboard-only walk, an axe scan per state, an intercepted image
request asserted to carry no `Referer` (99), and a clean console on every flow. The telemetry
assertion states the buffer's expected contents exactly after a toggle sequence: one
hierarchy-viewed event and one toggle event per toggle, and **no** additional route-viewed
event, because a toggle runs no loader and never leaves the idle navigation state
(invariant 161).

**The one thing local e2e cannot prove**, stated rather than quietly assumed: the local
Playwright server serves over `http://127.0.0.1`, and a page served over http does not block
an `http://` image - mixed-content blocking only happens on an https page. The local suite
therefore proves the *fallback* (invariant 97) by failing the image request through a route
mock, not the *browser block* (invariant 98). The block itself is verified against the
deployed https origin in the `deployed` Playwright project, where the live record with the
`http://` photo renders its initials.

**Built-output** - the chunk graph asserted so the login route imports no hierarchy code or
catalogue (invariant 175), alongside the existing `verify:build` assertions.

**Live** - `npm run smoke:live` gains an assertion that the real payload still parses into a
forest with more than one root, so a shape change in the shared database is caught by the one
suite that talks to it. It stays outside `verify`.

**Verified by reading, stated plainly** - invariants 183-186 (documentation) and 196 (no
speculative abstraction). Invariant 181's "the mockups are illustrative" is checked by the
design comparison at G3.

## Risks and mitigations

1. **Phase 2 has not merged.** Every *(phase 2)* reference could move before the rebase -
   `AuthenticatedLoaderData` and `AuthenticatedLayout` in particular, both of which this
   phase edits. Mitigation: the loop is sequenced behind phase 2, M1 touches none of it, and
   the rebase happens before M2 starts.
2. **`shouldRevalidate` is the sharpest edge in this phase.** The G1 grill caught the first
   draft of the rule breaking Retry, Refresh and phase 2's post-sign-out bfcache guard at
   once - a vacuously-true `every()` over an empty difference set returning `false` for an
   identical-URL revalidation. The rule is now stated exactly (non-empty difference, all
   members `expanded`, on **both** the `authenticated` and index routes), and it is mitigated
   three ways: the predicate is
   unit-tested as a pure function including the identical-URL case, M3's e2e counts requests
   across a toggle sequence, and M5 re-runs phase 2's own auth e2e flows unchanged, which is
   what would catch a regression in the bfcache guard.
3. **The shared-surface list in invariant 190** is a lot of blast radius for a feature phase. Mitigation: each is generic, each is listed before implementation rather than
   discovered in review, and each carries a decision-log entry. Anything beyond the list is a
   finding.
4. **Third-party photo hosts are outside our control.** Mitigation: the fallback is a tested
   path, e2e mocks image responses rather than hitting the hosts, and no test depends on a
   photo actually loading.
5. **The pushed history entry per toggle** interacts with phase 2's guard redirect and its
   `from` parameter. Mitigation: invariant 127 pins parameter preservation and M3's e2e
   exercises back and forward across a guard redirect.
6. **Size budget.** The tree route adds the domain, the widget and a catalogue to a per-route
   chunk with a 30 kB ceiling. Mitigation: M5 measures; if it busts, the number is revisited
   with the user per `ARCHITECTURE.md`'s own precedent rather than raised quietly.
