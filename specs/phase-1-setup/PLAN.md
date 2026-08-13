# Plan: phase-1-setup

Six milestones, 38 steps, executed sequentially. Every step's tests trace to PRODUCT.md
invariants by number; the invariant numbers in each step's description are the trace.

Milestone and step state is owned by `loop.json` - this document is the readable form, not
a second source. `loop step <n> red|green|done` and `loop milestone <n> verify|review` are
what actually record progress.

## Execution model

**Sequential. No worktree fan-out.** TECH.md's milestone section records the decision and
its reason, restated here because it is a plan-level choice:

- The dependency chain is M1 -> M2 -> M3 -> M4 -> M5 -> M6, fully sequential.
- M3 and M4 were the only fan-out candidates, and M4 depends on M3 for the configuration
  flag that mounts the kit route, so the pair is not independent.
- Both would also edit `package.json`, `vitest.config.ts` and `eslint.config.js`, which is a
  guaranteed three-way merge on files where a bad merge is SILENT - a dropped ESLint
  override does not fail a build, it removes a check.
- The saving would be one milestone's wall-clock on a six-milestone phase. The risk is
  losing an enforcement rule without noticing. Not worth it.

**TDD per step.** No implementation before the step's named test has been observed failing
and recorded with `loop step <n> red --evidence <log>`. The registered test names must grep
verbatim in the code before `red` is accepted - so a name that drifts is amended with
`loop step <n> amend`, never worked around.

**Boundary discipline.** At each milestone boundary: the full `npm run verify` chain runs,
evidence lands under `evidence/milestones/` as `m<N>-suite.txt` and `m<N>-e2e.txt`, then
`loop milestone <n> verify`, then a fresh `loop-reviewer` on that milestone's diff and
`loop milestone <n> review`. Findings go into the G4 ledger tagged `--round milestone-<n>`
and are dispositioned at that boundary, not batched into final G4. Blocking findings are
fixed before the next milestone starts.

Each of M1 to M4 is responsible for leaving `npm run verify` green as the WHOLE chain, not
a subset. A milestone that needs a check relaxed to pass has found a problem, not a nuisance.

## M1 - Toolchain, cruft removal and the verification harness

The verification harness comes first, because a milestone boundary has to be verifiable and
"verifiable" means a suite command that exists.

1. `VERIFICATION.md`, `.nvmrc` at 24.15.0, `package.json` `engines.node`, and the
   `.gitignore` blanket `*.log` fix so evidence logs under `specs/` are committable.
   Invariants 117, 118.
2. `tsconfig.app.json` gains `strict` plus `noUncheckedIndexedAccess`,
   `exactOptionalPropertyTypes`, `noImplicitOverride`; `tsconfig.tools.json`; path aliases
   in tsconfig, Vite and Vitest. Invariants 104, 105.
3. Vitest projects (jsdom, platform, ui), coverage thresholds at 85%, the
   `src/features/*/domain` 100% glob configured inert, `passWithNoTests: false`, and
   `vitest.setup.ts` stubbing the network globals in EVERY project. Invariants 108, 109,
   110, 115, 32, 21.
4. `playwright.config.ts` with the conditional `webServer` ARRAY and conditional `projects`
   array keyed on `DEPLOYED_BASE_URL`, the three projects, and `e2e/support/`. Invariants
   113, 100, 115.
5. Tailwind v4, Prettier with the tailwind plugin, `eslint-config-prettier` last.
   Invariant 107.
6. `vite.config.ts` `build.rolldownOptions.output` and `.size-limit.json` entry+vendor.
   **Empirically confirm** against installed vite 8.2.1 / rolldown 1.2.4 what `[name]`
   emits, that `rolldownOptions` is accepted, and that `codeSplitting` produces
   `vendor-*.js` without a deprecation warning - correcting TECH 5.3, the size-limit globs
   AND `declaration-table.test.ts`'s arming glob together if they disagree. Invariants
   112, 89.
7. Delete the template cruft; add `src/vite-env.d.ts` and a minimal `main.tsx` + `bootstrap`
   with one static placeholder that M1's own test covers, so 85% is met by real coverage of
   real code. Invariants 131, 136.
8. Every npm script from TECH 7.1, `vitest.build-output.config.ts`,
   `expected-build-output.json` seeded at `phase: 'building'`, and the
   `declaration-table` / `size-limit-entries` build-output tests. Invariants 102, 103, 112.

**Boundary**: `npm run verify` runs end to end and passes as the whole chain.

## M2 - Layers and boundary enforcement

9. The four layer directories and both feature slices with public entries. Invariants 1, 9.
10. `eslint-plugin-boundaries`: element definitions, the four `element-types` rows,
    `no-unknown` and `no-unknown-files` as errors, `entry-point`. Resolve the deprecation
    against the INSTALLED plugin - if `boundaries/dependencies` covers the same edges, use
    it and record the mapping. Invariants 1-7, 12.
11. Restricted imports and syntax: the single `import.meta.env` reader override, the
    enumerated network ban, the five storage globals in both bare and member forms, the
    sinks path ban, the `globalThis` telemetry selector scoped to `createRuntime.ts`.
    Invariants 13, 21, 45, 45a, 128.
12. jsx-a11y, i18next (`jsx-only` + ignoreAttribute list), react-hooks, testing-library,
    playwright, type-aware rules, and the `testing-harness` override scoped to test files
    only. Invariants 105, 106, 90.
13. The demonstrable negatives - cross-feature import, deep import, stray file,
    platform->shared, second `import.meta.env`, direct `fetch` - each captured as evidence
    and reverted in the same change. Invariants 10, 11.
14. `assert-no-physical-properties.mjs`, the identifier-level domain-vocabulary script, and
    `assert-no-secrets.mjs --source-only` in `lint`. Invariants 8, 67, 20, 133.

**Boundary**: `npm run lint` green on the tree, demonstrably red on each injected violation
with the rule named in the captured output.

## M3 - Platform adapters

15. `platform/configuration` - single env reader, Zod schema, frozen typed object,
    environment defaults, test injectability, the error screen naming keys not values.
    Invariants 13-20.
16. `platform/http` - injected transport, per-LOGICAL-REQUEST deadline, abort composition,
    `cancelled` as a sibling outcome, one retry on GET for network/timeout/5xx only,
    injected clock and randomness, traceparent, one timing record per attempt.
    Invariants 21-35.
17. `platform/observability` - the three-key facade, the factory's buffer handle, the three
    sinks, the bounded ring buffer, redaction before any sink, the level guard, and the
    whole-call guard. Invariants 45, 45a, 46, 48, 54-59.
18. The interaction tracker - one correlation id per navigation including initial load,
    exactly one `route_viewed` on success and none on failure. Invariants 47, 47a, 30.
19. `reportWebVitals` for LCP, INP, CLS, degrading silently. Invariants 52, 53.
20. `platform/internationalization` - per-feature namespaces, lazy loading, the missing-key
    handler, the explicit locale-to-direction map. Invariants 60-66.

**Boundary**: `npm run test:coverage` covers the whole platform layer with fakes. No e2e is
claimed - none is needed.

## M4 - Tokens and the UI kit

21. `theme.css` - tokens declared once, dark over the same names from
    `prefers-color-scheme`, logical properties, reduced-motion. Invariants 70, 71, 73, 75, 67.
22. `contrastPairs.ts` and the automated AA contrast assertion in both themes, plus focus
    indicators at 3:1. Invariants 72, 74.
23. The eight kit components, domain-free and literal-free, with Button's busy state
    suppressing activation via `preventDefault` first. Invariants 69, 76-85.
24. The single state inventory feeding both the unit tests and the kit route, one axe
    assertion per state in jsdom light, and the no-orphan-component check. Invariant 87.
25. The kit route MODULE behind the build-time flag, `skeletonSize.ts` / `sizeClass.ts`
    emitting no `style` attribute, and the stylesheet entry appended to `.size-limit.json`.
    Invariants 86a, 76, 112.

**Boundary**: the `ui` Vitest project passes with axe assertions and the contrast test.
It does NOT claim the browser checks - `/__kit` needs a router, which arrives in M5, so
invariants 86, 86a, 86b and the dark half of 87 are proven at M5's boundary.

## M5 - App shell

26. `createRuntime`, `runtimeContext`, `useRuntime`, and `ApplicationRoot` composing the
    provider stack in exactly one place. Invariant 90.
27. The router - `basename` from `configuration.basePath`, lazy route modules each awaiting
    its `loadTranslations`, `/`, `/login`, not-found, and no guard/redirect/fetch.
    Invariants 88, 89, 94, 97, 98.
28. Both placeholder pages - kit components, catalogue strings, one `h1`, `main` landmark,
    keyboard reachable, axe clean, `/login` generic. Invariants 95, 96, 96a, 132.
29. Both error boundaries, the shared `ErrorSurface` taking recovery as a prop, and the
    `createRoot` `onCaughtError`/`onUncaughtError` handlers. Invariants 91, 92, 93, 100.
30. The CSP plugin (meta policy WITHOUT `frame-ancestors`), `public/_redirects`,
    `public/_headers`, the favicon, `index.html`. Invariants 99, 99a, 101, 124.
31. Populate `expected-build-output.json`'s four conditional keys and flip `phase` to
    `'complete'`, arming `declaration-table.test.ts`; append route and catalogue size
    entries. Invariants 62, 86b, 89, 103, 122.
32. The full e2e suite plus the kit-route browser checks M4 could not run. Invariants 113,
    49, 86, 86a, 87, 100, 128.

**Boundary**: the e2e suite runs for the first time. `phase === 'complete'` is recorded in
the verify note directly - the one case the build-derived arming cannot see is a build that
emitted no route chunks at all.

## M6 - Pipeline and deploy

33. The `verify` job - seven gating steps in order, browser cache, the `site` artifact
    uploaded after `size` and BEFORE `e2e`, the report artifact with `if: always()`.
    Invariants 102, 103, 114, 117, 120.
34. The `deploy` job - `needs: verify`, gated on push to `main`, `permissions: contents:
    read`, the concurrency group, sparse `checkout` of `deployment.json`, artifact download,
    the SHA-pinned wrangler action, and the deployment-URL assertion. Invariants 120, 121,
    123, 125.
35. The workflow-parse test. Invariants 102, 135, 121.
36. `deployment.json`, the `production-hostname` markers in `VERIFICATION.md` and
    `.env.example`, and the doc-agreement test asserting each marker is PRESENT and agrees.
    Invariant 123.
37. The `live-smoke` job on `workflow_dispatch` only, outside every default Vitest project.
    Invariants 116, 116a, 116b.
38. `deployed-smoke.spec.ts` and the post-merge obligation. Invariants 123, 124, 126a,
    99a, 119.

**Boundary**: a CI run on the pull request is the evidence for every job except deployment.
This boundary explicitly does NOT claim invariants 123 and 124 - see below.

## The post-merge obligation

Invariant 121 forbids preview deployments, so no pull-request run produces a URL to test.
Invariants 123 and 124 are therefore proven only after the merge to `main`, and invariant
126a makes that an obligation rather than a gap:

- After merge, the deploy job runs and `npm run e2e:deployed` runs against the
  `productionHostname` from `deployment.json`.
- Its output is captured as `evidence/deployed-smoke.txt` and cited in PROOF.md.
- **The phase is not complete until it passes.** If it fails, a fix goes through these gates
  on a follow-up branch and the deployed run is repeated. The phase is not quietly called
  done on a green pull request (invariant 119).

## Prerequisite outside the repository

M6 depends on the repository owner having completed all three parts of the one-time setup
(invariant 126):

1. A Cloudflare Pages project created with **direct upload** (not Git integration, which
   would deploy without waiting for the gates).
2. **The project's production branch set to `main`.**
3. `CLOUDFLARE_API_TOKEN` (Pages edit scope only) and `CLOUDFLARE_ACCOUNT_ID` stored as
   repository secrets.

Items 1 and 3 fail loudly - wrangler names a missing token or an unknown project. Item 2
does NOT: it produces a successful upload to a preview URL while the production hostname
stays stale. That is why the deploy job asserts the returned deployment URL rather than
trusting `--branch=main` to mean what it looks like it means.

## Carried risk from G1

Recorded here because it shapes where to look during implementation, not only at sign-off:

- **The final nine G1 fixes were not re-confirmed by a validator** (the fourth confirmation
  cycle was declined). Two prior fix rounds each introduced 5-6 new defects, so these carry
  more risk than usual. They concentrate in M1 (the build config and declaration table) and
  M6 (the deploy job, `deployment.json`, the Playwright conditional config).
- **Codex's raiser-thread confirmation of Codex-45..55 never returned**; those fixes rest on
  the Claude-side re-checks of the same passages.
- Invariant 100's console assertion is an exact expected set rather than an empty console,
  and React Router's own `console.error` behavior stays UNVERIFIED until M5 installs it.
- The 100 kB entry budget leaves 10-15 kB for this repository's own code. Measured at M1
  deliberately, so a bust costs a dependency decision rather than a rebuild of everything.
