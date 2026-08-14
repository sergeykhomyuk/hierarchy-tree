# G1 delta re-check, second confirmation pass - fresh loop-spec-validator

A second FRESH validator instance ruled on the ten items the first confirmation pass left
open (5 PARTIALLY RESOLVED + 5 new defects). Item E's verdict was verified against
`node_modules` at the brief's instruction.

Outcome: 8 of 10 RESOLVED, 2 PARTIALLY RESOLVED, 0 NOT RESOLVED, plus 6 new defects - one
BLOCKING, and that blocking one was introduced by the previous round's `deployment.json`
fix (the deploy job reads the file with `jq` but had no `actions/checkout` step, so the file
is not in its workspace). Recorded as Claude-68 .. Claude-74.

Caveat the pass declared itself: `@playwright/test` is not installed, so its `webServer` and
project claims (item F and new defect 2) rest on API knowledge rather than on the package.

Verbatim output follows.

---

## Verdict

**8 of 10 RESOLVED** (2 PARTIALLY RESOLVED, 0 NOT RESOLVED) + **6 new defects (1 blocking)**

## Rulings

**A. RESOLVED** — TECH.md:800 defines `alwaysOn.sizeLimitEntries` as "the expected `.size-limit.json` contents - an array of `{ name, limit }` pairs" held in `expected-build-output.json` and compared against the real `.size-limit.json`, and the invariant-112 map row (TECH.md:1051) states the same thing including the same per-milestone contents ("the entry/vendor pair in M1, plus the stylesheet in M4, plus the routes and catalogues in M5"), which matches §7.3's M1/M4/M5 append schedule (:840, :847, :853-857); the expectation lives in a different file from the file under test, so the circularity is genuinely gone.

**B. RESOLVED** — TECH.md:805 now makes the test "derive, from `dist` alone, whether the phase is finished - a `dist` containing route chunks (`assets/*Route-*.js`) ... and FAILS when that is so while `phase` is still `'building'`", so an M5 implementer who touches neither `expected-build-output.json` nor `.size-limit.json` goes red at `verify:build`; the residual coupling to chunk naming is filed as new defect 3.

**C. RESOLVED** — TECH.md:488 now says the storage ban's "contents are specified once, in section 2.4, and are not restated here", and its one-line recap ("all five storage globals ... banned in both bare-identifier and member forms") agrees exactly with §2.4:365 and PRODUCT.md:186; the old three-item bare-identifier list is gone and no divergent copy survives.

**D. RESOLVED** — TECH.md:78 covers both context modules as a category ("`shared/ui/fieldContext.ts` exports `FieldContext`, and `app/composition/runtimeContext.ts` exports `RuntimeContext`") and :79 adds the `.tsx` test-helper category naming `renderRoute.tsx`, `renderComponent.tsx`, `kitStates.tsx`; walking every entry of the layout tree (TECH.md:83-246) I found no remaining file that falls under neither a convention bullet nor a listed exception — the closest residual is the bullet at :64 naming three barrel locations while the tree shows fourteen, but that same sentence makes the tree authoritative, so it is not actionable.

**E. RESOLVED** — verified directly against `node_modules`: `rolldown@1.2.4` declares `codeSplitting?: boolean | CodeSplittingOptions` (`define-config-Dsp5YQR4.d.mts:839`) with `CodeSplittingOptions.groups?: CodeSplittingGroup[]` (:1235) and `CodeSplittingGroup.test?: StringOrRegExp | CodeSplittingTestFunction` (:1071), marks `advancedChunks` `@deprecated ... use codeSplitting` (:841) with `AdvancedChunksOptions = CodeSplittingOptions` (:1244) and the runtime warning string at `create-bundler-option-wRiQzEJ3.mjs:3042`; `vite@8.2.1` declares `build.rolldownOptions?: RolldownOptions` (`vite/dist/node/index.d.ts:2199`) with `rollupOptions` deprecated (:2192) and passes `output.codeSplitting` straight through (`vite/dist/node/chunks/node.js:33660`); the only surviving `advancedChunks` mention in the specs is the explanatory sentence at TECH.md:679, and :687, :831, :905, :1120 all say `codeSplitting`.

**F. PARTIALLY RESOLVED** — TECH.md:773 does skip the preview server (`webServer: process.env.DEPLOYED_BASE_URL ? undefined : { ... }`), but :776 still specifies "A third project `development`, with its OWN `webServer` entry (`npm run dev -- --port 4174` ...)", which Playwright cannot express (webServer is config-level; `TestProject` has no `webServer`), so the dev server must join the same global config where the stated single-object ternary does not cover it — `npm run e2e:deployed` would still start a Vite dev server, i.e. the same class of coupling the fix was written to remove.

**G. RESOLVED** — PRODUCT.md:150 now reads "The rule's scope is the **`verify` job** ... The `deploy` job is not a gate ... the deploy job's one assertion (invariant 123's deployment-URL comparison) ... is the only such step this phase permits", with the added limit "A new `run:` line in the `deploy` job that checks the *code* rather than the deployment is a violation of this invariant's intent"; the contradiction with the deployment-URL assertion is genuinely gone, though the exception is now review-carried and unenforced (new defect 5).

**H. PARTIALLY RESOLVED** — the hostname itself is single-sourced (TECH.md:25, :89, :894 `jq -r .productionHostname deployment.json`, PRODUCT.md:176) and M6 is the right milestone because the value does not exist until the Pages project does, but two copies/drift paths remain: `deployment.json` holds `projectName` while the deploy command hardcodes `--project-name=hierarchy-tree` (TECH.md:889) with nothing asserting they agree, and `DEPLOYED_BASE_URL` is supplied by hand to the `deployed` project (:775, :921) with no check tying it to `productionHostname`, so invariant 126a's post-merge completion run can be pointed at a stale hostname and pass.

**I. RESOLVED** — TECH.md:798 now reads "The table has **five top-level keys**: `alwaysOn`, `routeChunks`, `catalogueChunks`, `spaFallback` and `kitRouteAbsent`. Seven assertion families sit under them, because `alwaysOn` is an object holding the three unconditional ones ... while the other four keys are one family each" (3+4=7, five listed, five claimed), with `phase` introduced separately in rule two (:802); the self-contradicting count is gone.

**J. RESOLVED** — TECH.md:892 states the boundary decidably: "every `uses:` whose owner is not `actions/` must be SHA-pinned; GitHub-owned `actions/*` steps may use a major tag", explicitly reconciled with the four `actions/*@v4` steps this section specifies, and no competing formulation of the rule survives anywhere in the specs.

## NEW DEFECTS

1. The `deploy` job is specified to read the committed `deployment.json` with `jq` but its enumerated steps contain no `actions/checkout`, so the file is not in its workspace and invariant 123's assertion cannot run. | `specs/phase-1-setup/TECH.md`:881 ("Steps: `actions/download-artifact@v4` for `site` into `dist/`, then …") vs :894 ("`jq -r .productionHostname deployment.json`") | The step fails with a missing-file error rather than a URL mismatch, and because the deploy job runs only on `push` to `main` this cannot be rehearsed on a pull request — it detonates inside the post-merge completion path of invariant 126a, which is the phase's exit criterion. | **BLOCKING**

2. The `deployed` Playwright project is described as "excluded from the default run", which Playwright has no mechanism for — every configured project runs unless filtered — so `npm run e2e` would execute `deployed-smoke.spec.ts` with `baseURL` = `process.env.DEPLOYED_BASE_URL` undefined. | TECH.md:775 ("A second project `deployed`, excluded from the default run and selected by `npm run e2e:deployed`") | CI's e2e step goes red on an invalid URL unless the config conditionally builds the projects array (the same `DEPLOYED_BASE_URL` switch the F fix introduced for `webServer`), and nothing in the spec says to do that. (Pre-existing wording, but it is now the direct sibling of this round's `webServer` ternary and unresolved by it.) | non-blocking

3. The new fail-closed arming condition depends on the same PascalCase chunk-name assumption the spec elsewhere flags as unverified, and M1's correction instruction names only the size-limit globs. | TECH.md:805 (`assets/*Route-*.js`) against :697 and :905 ("the globs and that section are corrected here") | If the installed rolldown emits a different `[name]`, the size-limit globs fail loudly and get fixed while `declaration-table.test.ts` silently never arms; and if M5's routes fail to code-split at all, `dist` has no route chunks, the guard stays quiet, `phase` stays `'building'`, and invariants 62, 86b, 89, 99a and 124 go unasserted with `verify:build` green. | non-blocking

4. The doc-agreement unit test has no defined citation format, no assigned edit to the documents it reads, and no stated behaviour when a document carries no citation. | TECH.md:25 ("`VERIFICATION.md` and `.env.example`'s comment cite it with a unit test asserting they agree") and :1065; against §3.1:420, where `.env.example` documents only the configuration keys, and the M1/M6 deliverable lists, neither of which says VERIFICATION.md or `.env.example` gains the hostname | Written as "the hostname cited … matches `deployment.json`", the test passes vacuously against a file that cites nothing, which reinstates exactly the silent documentation drift `deployment.json` was introduced to close; the implementer also cannot tell which milestone edits the M1-delivered `VERIFICATION.md`. | non-blocking

5. Invariant 102's newly review-carried half is absent from the review-dependent ledger, and nothing mechanically bounds the deploy job to its one permitted assertion. | PRODUCT.md:150 ("is caught in review") against TECH.md:1084-1102, the ledger that claims "the specific half of it that no test reaches, was moved onto this list. The list below is the honest one", and TECH.md:817, where the workflow-parse test's command rule applies to "every GATING `run:` line" only | The spec's own honesty ledger is now incomplete for the invariant that polices the workflow, and a second `run:` line in the `deploy` job — the exception 102 says is singular — fails no test. | non-blocking

6. The phase-`'complete'` completeness assertion enumerates the booleans and the four conditional families but says nothing about `alwaysOn.sizeLimitEntries`, and the comparison's direction is unstated. | TECH.md:804 ("every one of the four conditional families is present and non-empty and both `alwaysOn` booleans are `true`") against :800 | An empty or truncated expected array leaves the budget guard asserting nothing while `declaration-table.test.ts` passes; one clause ("`sizeLimitEntries` is non-empty and the comparison is an equality over the `{name, limit}` projection") removes the ambiguity. | non-blocking

## What was checked

I read `specs/phase-1-setup/PRODUCT.md` and `TECH.md` in full, plus the deployment/caching/decision-log sections of `specs/ARCHITECTURE.md`. Feasibility for item E was verified against the installed packages rather than the spec's claims: `node_modules/rolldown/package.json` (1.2.4), `node_modules/rolldown/dist/shared/define-config-Dsp5YQR4.d.mts` (lines 820-857, 1001-1071, 1207-1244), `node_modules/rolldown/dist/shared/create-bundler-option-wRiQzEJ3.mjs:3032-3042`, and `node_modules/vite/package.json` (8.2.1) with `node_modules/vite/dist/node/index.d.ts:2185-2199` and `node_modules/vite/dist/node/chunks/node.js:33660`. I also grepped the whole `specs/` tree for surviving `advancedChunks`/`rollupOptions`/`manualChunks` references and for every occurrence of the hostname, `deployment.json`, `projectName` and `--project-name` to hunt second copies; `@playwright/test` is not installed, so the Playwright `webServer`/project claims in findings F and 2 are from API knowledge, not from `node_modules`.
