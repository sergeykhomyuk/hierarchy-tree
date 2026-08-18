# Plan: phase-3-tree

Five milestones, 43 steps, 145 named tests, executed sequentially. Every step's tests trace
to PRODUCT.md invariants by number; the invariant numbers in each step's description are the
trace.

Milestone and step state is owned by `loop.json` - this document is the readable form, not a
second source. `loop step <n> red|green|done` and `loop milestone <n> verify|review` are what
actually record progress.

## The prerequisite that gates everything after M1

**Phase 2 has not merged.** TECH.md's baseline says it: this branch was cut from `main` at
`6511fb1`, every code reference marked *(phase 2)* describes `loop/feature/phase-2-login`
rather than `main`, and two of the files this phase edits - `createAuthenticatedLoader` and
`AuthenticatedLayout` - are phase 2's.

- **M1 touches none of it.** The pure domain, its fixtures and the guard-script retirement are
  independent of phase 2 and can start the moment this plan is approved.
- **M2 does not start until phase 2 merges and this branch rebases onto it.** M2's first
  file is the loader that phase 2 owns.
- The `blocked-on` link is recorded in the loop log rather than in `links`, because
  `phase-2-login`'s `loop.json` exists only on its unmerged branch and `loop link` refuses a
  blocker it cannot resolve. It is recorded properly at the rebase - or dropped, if phase 2
  is already done by then.

## Execution model

**Sequential. No worktree fan-out.** TECH.md's milestone section records the split; the
fan-out decision is a plan-level choice and is recorded here:

- The dependency chain is M1 → M2 → M3 → M4 → M5, fully sequential. M2 consumes M1's domain,
  M3 consumes M2's loader and result type, M4 drives M3's rendered tree, M5 closes over all
  four.
- M1 is the only milestone with no inbound dependency, and it is also the one that must land
  first for an unrelated reason: it retires the phase-1 tripwires that make `npm run lint`
  fail on this phase's first domain file. Nothing can run in parallel with the milestone
  everything else waits on.
- The only other pair worth considering, M3 and M4, share `HierarchyTree`, `TreeRow` and the
  row model. Parallel edits there are a guaranteed conflict on the files where the keyboard
  contract lives.

**TDD per step.** No implementation before the step's named test has been observed failing and
recorded with `loop step <n> red --evidence <log>`. The registered names must grep verbatim in
the code before `red` is accepted, so a name that drifts is corrected with
`loop step <n> amend` while the step is still pending - never worked around.

**Boundary discipline.** At each milestone boundary: the full `npm run verify` chain runs,
evidence lands under `evidence/milestones/` as `m<N>-suite.txt` and `m<N>-e2e.txt`, then
`loop milestone <n> verify`, then a fresh `loop-reviewer` on that milestone's diff and
`loop milestone <n> review`. Findings go into the G4 ledger tagged `--round milestone-<n>` and
are dispositioned at that boundary, not batched into final G4. Blocking findings are fixed
before the next milestone starts.

Each milestone leaves `npm run verify` green as the WHOLE chain, not a subset. A milestone that
needs a check relaxed to pass has found a problem, not a nuisance - invariant 194 is the rule
and M5 re-checks it against the finished pipeline.

## Invariants that deliberately span two milestones

Invariants 1-5 are scope statements and belong to no milestone by design. Every other invariant
has one owning milestone - the one whose boundary must demonstrate it - with the exceptions
TECH.md enumerates, restated here because they are what an auditor would otherwise read as gaps:

- **118-121** are written and unit-tested as pure functions in M1 (step 8) and wired to the URL
  in M3 (step 27).
- **87-88** are the same shape: the pure `defaultExpansion` in M1 (step 7), rendered in M3
  (step 27).
- **45 and 49** are owned by M2 as repository outcomes - the right `HierarchyResult.kind`
  (step 12) - and by M3 as rendered states (step 20). M2 cannot prove the render; no error
  state exists until M3.
- **114 and 115** are reachable from the mouse and the keyboard. M3 proves the mouse path
  (step 26), M4 the keyboard path (step 33). **142** is M4's alone (step 33): it is a statement
  about the keyboard sharing the mouse's implementation, so there is no mouse half to prove
  separately.
- **161 and 165** are written in M2 where the events are emitted (steps 13, 16), but their
  toggle and retry clauses cannot be exercised until toggles and the Retry wrapper exist, so
  M3 (step 22) and M5 (step 42) are where the exact buffer contents are asserted.
- **194** is executed in M1 (step 1), because nothing after it can go green otherwise, and
  re-checked in M5 (step 43) against the finished pipeline.
- **190** spans M2 (the app-layer half: the runtime clock, the tracker change, the loader's
  `userId`), M3 (the kit widening, the home-route rewrite, the lint rule) and M5 (the whole
  enumerated list checked against the actual diff, step 41).

Three telemetry and privacy invariants sit later than the code that emits them, because M2's
code cannot exercise them: **166** needs the row and the avatar callback (M3, step 25);
**167** ranges over M3's toggle event and M4's `*` event, so it is verified in M5 across the
finished event set (step 42); **169** is M5's for the same reason.

## M1 - The tree domain, and the tripwires that block it

Pure, synchronous, React-free. Nothing here logs; anomalies come back as data. Boundary target:
`npm run verify` green with `src/features/hierarchy/domain/**` at the 100% floor the pipeline
already enforces.

1. **Retire the phase-1 anticipation tripwires.** `buildForest` and `flattenVisible` leave
   `WHOLE_SCOPE_BANNED_NAMES` and the `role="tree"` attribute check goes, in
   `assert-domain-vocabulary.mjs` and its pin in `guard-scripts.test.ts`. Every other banned
   word, the `platform`/`shared` export bans and the `/secrets` literal check stay. Lands first
   because nothing after it can go green. Invariant 194.
2. Branded `PersonIdentifier` and `EmailAddress` with their parsers, plus `person.ts`,
   `treeNode.ts`, `forestAnomaly.ts` and the fixture set. Invariants 52 (mechanism; proven at
   M2's boundary), 24.
3. `buildForest` shape: ordered roots, ordered children, manager status, direct report counts,
   and the three summary counts computed **after** duplicate removal, which is what makes
   invariant 82 true at M3. Invariants 6, 8, 9, 17-23.
4. `buildForest` anomalies: dangling references, self-references, cycles broken at the earliest
   ring member, duplicate ids where the first **valid** occurrence wins. Returned as data,
   never logged. Invariants 7, 10-16.
5. `buildForest` purity and linearity - no mutation of the input, and a bounded per-person visit
   count measured by instrumented operations across sizes, not by timing. Invariants 24, 25, 26.
6. `flattenVisible`: an iterative pre-order walk over an explicit stack producing the
   `VisibleRow` list, as the single source of what renders, what the ARIA attributes say and
   what the keyboard moves through. Invariants 27-40.
7. `defaultExpansion`: every root plus every root's direct children that have children of their
   own, computed from the forest. Invariants 87, 88 (pure half).
8. `parseExpansion` / `formatExpansion`, total by construction. Absent and present-but-empty
   are distinct inputs with distinct results; there is no "malformed parameter" branch, because
   a per-segment parser cannot have one. Invariants 118-121.

**Boundary**: `npm run verify` green as the whole chain, domain coverage at 100%. No e2e is
claimed - none is needed for a pure layer.

## M2 - The boundary, the repository and the loader

Starts **after the rebase onto merged phase 2**. Boundary target: suite green, plus e2e route-
mocking every envelope and outcome shape a browser can actually produce, **with the page still
rendering phase 1's placeholder**. This milestone owns the result kind the repository returns,
not the state that renders it.

9. `personSchema` and `usersResourcePath`. Zod strips everything not named, `password`
   included; failures report field names and the element's position, never values. Invariants
   47, 50, 51, 52, 53.
10. `parsePeople` envelope normalization **ahead of validation**: `null` holes removed rather
    than counted as malformed rows, an object read in own-key order, `null` as an empty list,
    every scalar as `invalidEnvelope`. Invariants 42-46.
11. Display derivation on the parsed person: names trimmed and never re-cased, the email exactly
    as stored, and the both-names-empty case falling back to the email. Invariants 54, 55, 56.
12. The `fetchPeople` repository and its total `HierarchyResult` union. `allRowsInvalid` is a
    failure, not an empty; `cancelled` is its own kind, reachable with a pre-aborted signal. It
    never throws and never rejects. Invariants 41, 48, 49, 57, 170, 174.
13. The telemetry the repository emits: one hierarchy-viewed event per completed load, one drop
    report, one report per anomaly kind, one error event with the failure kind and correlation
    id, and none at all for a cancelled request. Invariants 160, 161 (emission half), 162-165.
14. `AnalyticsPayloads` becomes an `interface` a feature augments by declaration merging,
    targeting the **declaring module** rather than the observability barrel - the facade imports
    the interface from the declaring module, so augmenting a re-exporting barrel merges nothing
    it can see. Invariant 168.
15. The app-layer loader: `createHierarchyLoader` returning an object *holding* a promise
    without awaiting it, the correlation id read from the interaction tracker, the loader's
    `request.signal` forwarded into `HttpRequest.signal`; `createAuthenticatedLoader` returns
    `userId`; `createRuntime` exposes the clock it already builds. Invariants 41, 170, 173, and
    the app-layer half of 190.
16. **The `shouldRevalidate` predicate, on BOTH the `authenticated` and index routes.** Compute
    the set of search parameters whose values differ between the current and next URL; return
    `false` only when that set is **non-empty** and every member of it is `expanded`; otherwise
    return `defaultShouldRevalidate`. Plus the interaction tracker learning to ignore a state
    change where `navigation.state` is unchanged **and** `revalidation` changed, and nothing
    wider. Invariants 124 (mechanism), 161 and 165 (the no-route-viewed halves).

**Boundary**: suite green; e2e over a dense array, an array with a `null` hole, an object map,
`null`, a scalar, a 500 and an all-rows-invalid payload, asserting the telemetry buffer.
`cancelled` is a unit case with a pre-aborted signal and **not** an e2e case - TECH.md
establishes that a superseded navigation does not abort this loader's request, so no Playwright
flow can produce one.

## M3 - The page: four states, the tree, and expansion

Mouse-operable throughout; the keyboard is M4's. Boundary target: suite green, e2e over all four
states, screenshots per state.

17. The UI kit widens generically: `ErrorState` gains `secondaryAction`, `glyph` and `framed`
    (default `true`) so the page composes it inside its own `Card` without nesting two frames;
    `EmptyState` gains `glyph` and the same `framed`; `Avatar` gains `onImageError`. No domain
    concept enters a kit signature. Invariants 190, 191.
18. `img-src` widens to `'self' data: https:` and no other directive changes. `http://` URLs
    stay blocked, which is what keeps the mixed-content fallback a real path. Invariants 99,
    171, 172.
19. `HierarchySkeleton` and the loading state - decorative to assistive technology, announced
    busy once, no summary line, no minimum display time. Invariants 58-63, 65.
20. The error state: the glyph, heading, body, the **correlation-id** chip, Retry and Back to
    login, exposed as the page's live status, never reaching an error boundary, leaving
    `expanded` untouched. Invariants 45 and 49 (rendered), 66-69, 73-77.
21. The empty state: one action, `Refresh`. No tree, no summary, no `tree` role. Invariants 44
    (rendered), 78, 79, 80.
22. **`HomeRoute` stops being a bare re-export** and becomes the module that assembles the
    feature's dependencies and wraps Retry and Refresh in
    `beginInteraction` → `revalidate()` → `endInteraction()` - **and on unmount too**, so a
    navigation started during a slow retry mints its own correlation id instead of inheriting
    the retry's. `useRevalidator` joins the feature layer's `no-restricted-imports` list so the
    rule is enforced rather than asked for. Invariants 70, 71, 72, 79, 193.
23. `HierarchySummary`: the counts, from the forest, describing the whole forest rather than the
    visible rows. Invariants 81, 82, 83.
24. `HierarchyTree` and `TreeRow`: the row anatomy, the indent rail, an **explicit** accessible
    name (a `treeitem` otherwise takes its name from the email, the count and the toggle glyph),
    the badge, the "you" marker, and memoization over **primitives** - `flattenVisible` returns
    fresh objects, so a `memo` comparing a `VisibleRow` prop would re-render all 33 rows on
    every toggle. Invariants 84, 85, 86, 89, 90, 91, 93-96, 100-103.
25. The photo failure fallback, reported once per person **per load**: the dedupe set is keyed
    by person id, held by the page, and **resets when a new payload resolves**, because the page
    does not remount across a revalidation. Invariants 97, 166.
26. `TreeToggle` and the mouse toggle path: `tabIndex={-1}` so the tree stays one tab stop,
    the inert glyph elsewhere, a subtree hidden in one step, descendant expansion restored on
    re-expand, immediate with no request and no forest rebuild. Invariants 105-112, and the
    mouse path of 114 and 115.
27. `useExpansion` over `useSearchParams`: push per toggle, every other parameter preserved,
    nothing written to storage, and the default expansion rendered on first arrival. Invariants
    87 and 88 (rendered), 116, 117, 122-129.
28. `NavigationRail` in `src/app/layout/`, rendered by `AuthenticatedLayout` so it appears on
    every authenticated page. `aria-hidden`, no focusable content. Invariant 92.
29. The hierarchy catalogue: no literal, plurals through the catalogue's rules, numbers through
    `Intl`, the summary from one placeholder string, logical properties throughout, loaded with
    the route. Invariants 153-159.
30. **Mockup fidelity, and the three layout assertions jsdom cannot make** - written in
    Playwright, where rects are real: bounding boxes identical across the data arriving (64),
    scroll held across a toggle (113), and one line at 320/768/1280px (104). Plus the four
    states against the mockups and both themes at the contrast floor. Invariants 64, 104, 113,
    179-182.
30a. **Loaded-state alignment correction requested during implementation** - compare the
    rendered 960x600 shell and row rhythm directly with mockup `1e`, then correct the
    authenticated-shell composition, canvas/card insets, decorative rail, row density,
    indent rails and signed-in-row treatment without changing tree behavior. Guarded by
    Playwright test `the loaded hierarchy matches mockup 1e's shell and row rhythm`.
30b. **Non-data-state alignment review fix** - assert the loading header geometry and the
    centered empty/error treatment against mockups `1f`, `1g` and `1h` in Playwright.
30c. **Narrow-width review fix** - assert that the deepest manager retains usable text
    width and the tree has no horizontal overflow at 320px, not merely that text does not
    wrap.
30d. **Graphical-object contrast review fix** - register the indent-rail and toggle-border
    token pairs at 3:1 in both themes and make the pair matrix fail for faint tokens.
30e. **Shared-kit scope review fix** - keep mockup-specific unframed typography, spacing,
    chip and button classes out of the framed `EmptyState` and `ErrorState` presentation.

**Boundary**: suite green; e2e over all four states, a photo failing to initials, retry with a
fresh correlation id, refresh/shared-link/back/forward, and the exact telemetry buffer after a
toggle sequence; screenshots per state.

## M4 - The keyboard and the ARIA contract

Boundary target: suite green, e2e driving the tree by keyboard alone key by key, axe clean on
all four states.

31. Roving tabindex: one tab stop, first Tab onto the first visible row, exactly one tabbable
    row, return-to-tree restoring the last focused row and falling back when it is gone.
    Invariants 107, 130, 131, 132.
32. Arrow, Home and End movement, including the four inert cases. Invariants 133-136.
33. Enter and Space toggling through **the same implementation the mouse uses**, and moving
    focus writing nothing to the URL and nothing to telemetry. Invariants 137, 142, and the
    keyboard path of 114 and 115.
34. Type-ahead against the row's **accessible name**, locale-aware and accent-insensitive, with
    the buffer reset driven by the **injected `Clock`** - `setTimeout` is banned across `src`
    with no feature override. Invariants 138, 139.
35. `*` as one action: one history entry, one announcement, one event - and nothing at all when
    it would open nothing. Invariants 140, 141.
36. Focus never orphaned - the collapse case and the **history-navigation** case, where the
    focused row vanishes with no collapse having been performed - plus the focus ring, the ARIA
    attribute exposure, polite announcements, reduced motion, and axe over components and pages.
    Invariants 143-152.

**Boundary**: suite green; a keyboard-only e2e walk; zero axe violations on all four states as
components and as pages.

## M5 - Closing

Boundary target: `npm run verify` and `npm run e2e` green, budgets inside their ceilings, the
deployed run green post-merge.

37. `README.md` rewritten - what this project does, how to run and test it, how it deploys,
    where the specs live - with the security gap stated plainly and no sentence of the Vite
    template surviving. Invariants 183, 184.
38. The **eight** decision-log entries and the `ROADMAP.md` update. Two of the eight depart from
    the mockups, six from `ARCHITECTURE.md` or a phase-1 decision; invariant 185 states the
    count in three places and requires the three to agree. Invariants 185, 186.
39. `npm run smoke:live` gains an assertion that the real payload still parses into a forest
    with more than one root, so a shape change in the shared public database is caught by the
    one suite that talks to it. Stays outside `verify`.
40. Built-output and budget assertions: the login route importing no hierarchy code or
    catalogue, the tree route inside the per-route ceiling, the app entry unchanged.
    Invariants 175-178.
41. **Phase 2 untouched, asserted rather than claimed**: its suite and e2e flows re-run
    unchanged, the route set unchanged, the layer boundaries holding, and the shared-surface
    diff matched against invariant 190's enumerated list - anything beyond it is a finding, not
    a diff to absorb. Invariants 187-193, 196.
42. The finished event set swept for privacy and the console swept for noise, across M3's toggle
    event and M4's `*` event together. The e2e suite states the buffer's expected contents
    exactly rather than counting loosely. Invariants 167, 169, 195.
43. Pipeline integrity re-checked against the finished chain, and **the one check no automated
    run makes**: invariant 98's mixed-content block verified by hand against the deployed https
    origin, screenshot under `evidence/`, cited from PROOF.md. Invariants 98, 194.

**Boundary**: `npm run verify` and `npm run e2e` green, size budgets inside their ceilings, and
`npm run e2e:deployed` green post-merge.

## Plan-level decisions

**The documentation steps carry a mechanical test rather than "verified by reading".** TECH.md
files invariants 183-186 under "verified by reading, stated plainly", but G2 refuses a step
with no named test, and `na` covers coverage-only, review-driven, refactor and characterization
steps - none of which a documentation rewrite is. Rather than bend a case to fit, steps 37 and
38 are guarded by a documentation-agreement test in `scripts/`, following this repository's own
`deployment-configuration.test.ts` precedent. Invariant 185's "the count is stated in three
places and the three must agree" is already an agreement assertion in prose; this makes it one
in code. **This is an addition to TECH.md's testing section, made at plan time and recorded
here rather than absorbed silently.**

**Step 43's named tests guard the pipeline half, not the manual half.** Invariant 98 is verified
by hand by the user's own recorded decision, and a manual check has no test name to freeze. The
step's registered tests are invariant 194's re-check - no check disabled, no threshold lowered -
which is mechanically checkable; the mixed-content verification is carried as the step's
evidence artifact and cited from PROOF.md. Naming a fake test for it would be worse than saying
plainly which half is automated.

## Correction made while planning

TECH.md carried two stale **"index route only"** phrases - the `shouldRevalidate` bullet's own
heading and risk 2's mitigation - left behind when round 3 corrected the rule in the body of the
same section. Both now read "on both the `authenticated` and index routes", matching the
normative paragraph. No rule changed; the documentation had contradicted itself in a place an
implementer reads first, and invariant 161 depends on the corrected form. Recorded in the loop
log.

## Carried risk from G1

Recorded here because it shapes where to look during implementation, not only at sign-off:

- **Every repair round but the last introduced a new blocking defect.** Round 1's
  `shouldRevalidate` rule was vacuously true on an identical-URL revalidation and would have
  silently disabled Retry, Refresh and phase 2's post-sign-out bfcache guard; round 2's fix
  scoped the predicate to one route and falsified invariant 161; round 3's fix left layout
  assertions in jsdom and gave the home-route rewrite a milestone whose own boundary forbade
  it. Round 4 was the first round to find zero new design defects. **Step 16 is the sharpest
  edge in the phase** and is mitigated three ways: the predicate is unit-tested as a pure
  function of two URLs including the identical-URL case, M3's e2e counts requests across a
  toggle sequence, and M5 re-runs phase 2's own auth e2e flows unchanged.
- **The shared-surface list in invariant 190 is a lot of blast radius for a feature phase** -
  ten changes across the kit, the platform, the app's composition, the lint policy, phase 2's
  files and the CSP. Each is generic and carries a decision-log entry, and step 41 checks the
  actual diff against the list. Anything beyond it is a finding.
- **Two phase-2 files move under this branch before M2 starts.** `AuthenticatedLoaderData` and
  `AuthenticatedLayout` are edited by this phase and owned by an unmerged branch; the rebase is
  where that risk lands.
- **Invariant 98 is the one thing no suite proves.** It is verified by hand, by the user's
  explicit decision, and the evidence is a screenshot rather than a log.
