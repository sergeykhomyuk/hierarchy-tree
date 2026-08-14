# G1 delta re-check - fresh loop-spec-validator, round 5 confirmation pass

A FRESH validator instance (not the one that raised the delta findings, and not the session
that wrote the fixes) re-read the amended PRODUCT.md and TECH.md and ruled on each of the 15
delta findings. Its verdict on finding 15 was verified against `node_modules` rather than
against the spec's own claims, at the brief's explicit instruction.

Outcome: 10 of 15 RESOLVED, 5 PARTIALLY RESOLVED, 0 NOT RESOLVED, plus 5 new defects the
amendments themselves introduced. Recorded as Claude-58 .. Claude-67. All ten were then
fixed and re-submitted for a second confirmation pass.

Notable: the re-check refuted the driving session's own fix for Claude-57. The fix specified
`output.advancedChunks`, which the installed rolldown 1.2.4 also deprecates in favour of
`output.codeSplitting` and which warns on every build - a fix that used a deprecated option
while arguing against deprecated options. Independently verified before accepting:
`define-config-Dsp5YQR4.d.mts:841` marks `advancedChunks` deprecated and `:1243` makes
`AdvancedChunksOptions` an alias of `CodeSplittingOptions`;
`create-bundler-option-wRiQzEJ3.mjs:3042` logs the warning.

Verbatim output follows.

---

## Verdict

**10 of 15 RESOLVED** (5 PARTIALLY RESOLVED, 0 NOT RESOLVED) — plus **5 new defects** (0 blocking).

---

1. **RESOLVED** — Every chunk-name reference is now PascalCase and mutually consistent: TECH.md:693-695 pins `assets/HomeRoute-*.js` etc. with the `[name]`-is-verbatim rationale, §3.5:518 says `assets/LoginRoute-<hash>.js`, §7.3:842-844 globs `dist/assets/{HomeRoute,LoginRoute,NotFoundRoute}-*.js`, the Risks entry:1109 and the naming-convention ledger:1093 both restate it; a grep for `home-route|login-route|not-found-route` finds no surviving kebab-case chunk reference anywhere in `specs/`.

2. **PARTIALLY RESOLVED** — §7.1:794 does give the three unconditional families a key (`alwaysOn.{basePath,bundleSecrets,sizeLimitEntries}`), so invariant 122's activation gap is closed, but the size-limit ambiguity is not: §7.1 defines `alwaysOn.sizeLimitEntries` as "a boolean that is `true` from M1", while the invariant-112 map row:1040 says the test "reads the expected set from the same `.size-limit.json`-shaped expectation the declaration table's `alwaysOn.sizeLimitEntries` flag activates" — a boolean carries no set of names and limits, no section declares where that expectation lives or who grows it at M4/M5, so an M1 implementer still cannot write `size-limit-entries.test.ts` (and if it reads the expectation out of `.size-limit.json` itself, the check is circular and defeats its own stated purpose that "a busted budget cannot be fixed by editing the budget").

3. **PARTIALLY RESOLVED** — `declaration-table.test.ts` (§7.1:796, layout:113, M5:908) would genuinely fail the forgot-`kitRouteAbsent` case *once `phase` is `'complete'`*, and it is wired into M5's boundary text, but the arming condition is itself an undeclared, unchecked edit in the same file at the same milestone: nothing anywhere asserts that `phase` ever becomes `'complete'` (no M6 check, no workflow-parse assertion, no build-output test), so an M5 implementer who skips the table edit wholesale — omitting both `kitRouteAbsent` and the flip — reproduces exactly the original silent-pass, and §7.1's claim "M5's own boundary cannot go green without it" is true only if the flip happened.

4. **RESOLVED** — `build-output/bundle-secrets.test.ts` is in the layout (TECH.md:115) annotated "runs assert-no-secrets.mjs --bundle-only (invariants 20, 133)", §7.1:790 lists the bundle secrets scan among `verify:build`'s assertions, CI runs `npm run verify:build` as a named step (§7.4:865), and the invariant-133 map row:1066 states the two-half split with `--bundle-only` failing rather than skipping on a missing `dist`.

5. **PARTIALLY RESOLVED** — PRODUCT 128 (:186) and TECH §2.4:363 both now enumerate `localStorage`/`sessionStorage`/`indexedDB`/`caches`/`navigator.serviceWorker` in identifier *and* member forms and restore the e2e emptiness assertion in `telemetry-buffer.spec.ts`, but §3.3:486 — the passage that *does* the rehoming and that §2.4 points back at — was not amended and still reads "`no-restricted-globals` entries for `localStorage`, `sessionStorage` and `indexedDB` are installed in this phase", i.e. the old three-item bare-identifier list, so the document now states the ban's contents two different ways.

6. **RESOLVED** — PRODUCT 99a (:144) requires the check to compare `dist/_headers` "against its exact expected content byte for byte - the `/*` path line and the one indented header line and nothing else", and the map row:1025 repeats it with both reasons (the "only directive" clause and Cloudflare's silent ignoring of an unindented header line); a mis-indented file no longer passes, which the previous containment check did.

7. **RESOLVED** — §6.2:769 states the `webServer` "**serves the existing `dist` and does not rebuild it**" (`npm run preview -- --port 4173`), and §7.4:867 moves `upload-artifact` for `site` to immediately after `size` and before `e2e`, with "The workflow-parse test asserts the upload step precedes the e2e step, so the ordering cannot drift back" — that assertion does fail against the broken arrangement, unlike the old "consumes the artifact rather than building its own" one.

8. **RESOLVED** — PRODUCT 126 (:179) now names "**the project's production branch set to `main`**" as a load-bearing prerequisite with the preview-URL failure mode spelled out, and 123 (:176) requires the deploy step to assert Wrangler's returned deployment URL *is* the recorded production hostname; §7.4:883 implements it and the map rows 123/126 (:1054, :1057) name it as the only mechanical check over 126.

9. **RESOLVED** — §7.3:820 puts "**The `build.rolldownOptions.output` block of section 5.3 ships in M1**" with the reason (`entry-*` and `vendor-*` exist only because of it), §7.3:821 moves the stylesheet entry to M4, §7.3:823 summarises the M1/M4/M5 split, and the M1 (:894) and M4 (:904) milestone bullets match; M1's globs now resolve against a real build.

10. **RESOLVED** — PRODUCT 126a (:181) states the obligation, the reason preview deploys were rejected, the remedy on failure ("a fix lands on a follow-up branch through the same gates, and the deployed run is repeated"), and that "No milestone boundary and no pull-request run may claim invariants 123 or 124 as verified"; M6's "Verifiable because" (:911) explicitly does not claim them, and the map carries a 126a row (:1059).

11. **RESOLVED** — §1:64 scopes barrels to "public surface" folders, forbids `sinks/index.ts` by name with the exact lint-evasion mechanism, explains `app/routing/routes/` (code splitting) and `shared/theme/`, and names the layout as the authority; §1:65 retracts the false claim, stating plainly that `no-restricted-imports` covers only `@features/*` and the sinks path and that folder-only importing elsewhere "is convention, not a rule". I checked the layout tree against the amended rule and found no remaining unexplained barrel-less multi-file folder.

12. **RESOLVED** — §7.4:870 adds `permissions: { contents: read }` with the inherited-default-scope rationale, and :881 requires the action to be referenced by commit SHA with the version in a trailing comment plus "The workflow-parse test asserts every third-party `uses:` is SHA-pinned, so this cannot drift back to a tag" (see new defect 5 for the scope of "third-party").

13. **RESOLVED** — The review-dependent ledger (:1073-1094) contains no 37 or 42; the header paragraph records the removal and why ("The numbers are retired, not reused, so they are simply gone from here").

14. **PARTIALLY RESOLVED** — §1:71-79 replaces "two documented exceptions" with a seven-item enumeration that covers `environment.ts`, non-module files, `main.tsx`, `vite-env.d.ts`, `RootErrorBoundary`, `fieldContext.ts` and `analyticsEvents.ts`, but the list is still not complete against the layout it governs: `src/app/composition/runtimeContext.ts` ("React context carrying the runtime object", :138) is the identical case to the enumerated `shared/ui/fieldContext.ts` — a lowerCamelCase filename exporting a PascalCase context object — and is not listed, so the "complete list" claim is again falsifiable by reading the tree beneath it (the `.tsx` test helpers `renderRoute.tsx`, `kitStates.tsx`, `renderComponent.tsx` are a weaker instance of the same).

15. **PARTIALLY RESOLVED, verified against `node_modules`** — `vite@8.2.1` and `rolldown@1.2.4` are the installed versions; `vite/dist/node/index.d.ts:867,2192,3628,3773` do mark `rollupOptions` `@deprecated Use rolldownOptions instead`, rolldown's `define-config-Dsp5YQR4.d.mts:803` confirms `manualChunks` is deprecated *and* ignored when `codeSplitting` is set, `advancedChunks?: { ... groups?: CodeSplittingGroup[] }` (:849-857) is a real accepted shape whose group `{ name: 'vendor', test: /node_modules/ }` produces `vendor-[hash].js` (:1001-1023), and Vite spreads user `output` last (`chunks/node.js:33673`) leaving `codeSplitting` as `undefined` for the `es` format (:33660) so the option is not ignored — **but `advancedChunks` is itself `@deprecated Please use output.codeSplitting instead` (:841) in the installed rolldown, and `create-bundler-option-wRiQzEJ3.mjs:3042` logs "`advancedChunks` option is deprecated, please use `codeSplitting` instead." on every build**; the correct current spelling is `output.codeSplitting: { groups: [...] }` (identical group shape), so §5.3's config works while contradicting its own stated rationale for avoiding "an alias the tool already deprecates", and §5.3/§7.3/M1/Risks all name the deprecated option.

---

## NEW DEFECTS

1. **The finding-7 fix broke `npm run e2e:deployed`: with the build removed from `webServer`, a run on a checkout that has no `dist` cannot start.** | TECH.md §6.2:769 (`webServer` is now `npm run preview -- --port 4173`, and "`vite preview` fails loudly on a missing `dist`") against §6.2:771 (the `deployed` project "selected by `npm run e2e:deployed`") | Playwright's `webServer` entries are global config, not project-scoped, so they start for `--project=deployed` as well; previously the `npm run build && npm run preview` command made that self-healing, and now the post-merge evidence run that invariant 126a makes the phase's completion condition fails at server startup unless the operator happens to have built first. The config needs an explicit exemption (or a guard on `process.env.DEPLOYED_BASE_URL`) and the spec does not state one. | non-blocking

2. **The deploy job's new deployment-URL assertion is a check that lives only in the workflow file, which invariant 102 forbids in unqualified terms.** | PRODUCT.md 102 (:150) "There is no gate that exists only in the workflow file... a run line that is neither an npm script nor an allow-listed setup command fails the workflow-parse test" vs TECH.md §7.4:883 "the job echoes it into the run summary... and asserts it equals the recorded production hostname, failing the job when it does not" | Those are `run:` lines that are neither `npm run <script>` nor on the two-command infrastructure allow-list. §7.1:806 scopes the test's command rule to "every GATING `run:` line", but nothing says the deploy job is non-gating, so an implementer writing the workflow-parse test either turns it red against the very workflow §7.4 specifies or narrows 102's rule by judgement. | non-blocking

3. **Nothing declares a machine-readable home for the "recorded production hostname" the deploy job must compare against.** | PRODUCT.md 123 (:176) "recorded in the repository so the check has a concrete target"; TECH.md:25 records it "in `VERIFICATION.md` and in `.env.example`'s comment" | A workflow step cannot reasonably read a Markdown document or a dotenv comment, so the implementer will hardcode the hostname in `ci.yml` (or a repo variable) — creating a second, undeclared copy that can drift from `VERIFICATION.md` with no check pairing them, in the one assertion that exists to catch a silent mis-deploy. | non-blocking

4. **The amended declaration-table paragraph miscounts its own keys and families.** | TECH.md §7.1:794 "The table has six keys, one per family: `alwaysOn` (...), plus `routeChunks`, `catalogueChunks`, `spaFallback` and `kitRouteAbsent`" | Five keys are named, covering seven assertion families, and the sixth key (`phase`) is introduced only in the next paragraph and is not a family — the same class of self-contradicting count that finding 2 was raised about. An implementer treating "six keys, one per family" as a checklist looks for a missing sixth family key. | non-blocking

5. **"Every third-party `uses:` is SHA-pinned" is undefined against the four `actions/*` steps the same section shows pinned by tag.** | TECH.md §7.4:881 vs §7.4:862-869 (`actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`, `actions/download-artifact@v4`) | The spec never says whether GitHub-owned `actions/*` count as third-party, so the workflow-parse assertion either fails against the workflow this section specifies or silently exempts a category by an implementer's private definition — the identical gap §7.1 had to close for the command rule with an explicit allow-list. | non-blocking

---

## What was checked

I read the current `specs/phase-1-setup/PRODUCT.md` (all 254 lines) and `specs/phase-1-setup/TECH.md` (all 1113 lines, in four passes), plus `specs/ARCHITECTURE.md`'s decision log and "deliberately not built" sections and `package.json`. For finding 15 I verified against the installed packages rather than the spec's claims: `node_modules/vite/package.json` (8.2.1), `node_modules/rolldown/package.json` (1.2.4), `node_modules/vite/dist/node/index.d.ts` (the `rollupOptions` → `rolldownOptions` deprecations), `node_modules/vite/dist/node/chunks/node.js:33644-33674` (Vite's output normalisation, `codeSplitting` default and the trailing `...output` spread), `node_modules/rolldown/dist/shared/define-config-Dsp5YQR4.d.mts:780-857` and `:1001-1030` (the `manualChunks`/`advancedChunks`/`codeSplitting` deprecations and the `CodeSplittingGroup` shape), and `node_modules/rolldown/dist/shared/create-bundler-option-wRiQzEJ3.mjs:3017-3073` (the runtime warning and precedence logic). For finding 1 I grepped all of `specs/` for kebab-case and PascalCase route/chunk references to confirm no surviving inconsistency.
