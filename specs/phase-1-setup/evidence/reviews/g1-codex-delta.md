# G1 delta - Codex second opinion, round 5 (OPERATIVE PASS)

Fresh Codex thread, session `019ffa93-f0b5-7f11-94f7-58327e9f4862`, job `task-msrcp1xo-yexaci`.
Duration 5m 14s. Brief: the scoped A-E delta contract (cache withdrawal, Cloudflare Pages
move, file conventions) - see skills/dev/references/codex-contract.md G1 section.

Two Codex passes exist for this round and BOTH are preserved, per the codex contract's
reconcile-visibly rule. THIS is the operative pass: it received the full A-E delta brief.
The other (`g1-codex-delta-supplementary.md`, job `task-msrcn25z-44hdzd`) was launched by
the skill invocation before the brief was sent and answered a broader question. It is not
discarded - it is a properly formatted, correctly cited review, and three findings unique
to it were verified against the files and recorded as Codex-53, Codex-54 and Codex-55.
Neither pass is preferred for reading cleaner; the operative one is named by brief, not
by verdict.

Verbatim output follows.

---

8 findings (4 blocking)

1. The CSP split is not asserted as exclusive: `_headers` may contain additional CSP directives while both the build-output and deployed checks still pass | [PRODUCT.md invariant 99a](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:144), [TECH.md testing map](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:979) | An added `default-src`, `script-src`, or `connect-src` header creates the two potentially conflicting policies invariant 99a explicitly forbids; the checks only require `frame-ancestors 'none'`, not that it is the header's sole directive | BLOCKING

2. `expected-build-output.json` fails open because absent keys assert nothing and no independent schema test requires all four M5 keys | [TECH.md section 7.1](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:768), [M5](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:863) | Forgetting `spaFallback`, `kitRouteAbsent`, `routeChunks`, or `catalogueChunks` silently disables its check while `verify:build` remains green | BLOCKING

3. Invariant 128 promises to prohibit service-worker-cache access, but the lint design omits the CacheStorage `caches` global | [PRODUCT.md invariant 128](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:184), [TECH.md section 2.4](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:350) | `await caches.open('app')` in `src` passes the specified storage rule, so part of the rehomed cache invariant was dropped | BLOCKING

4. The Cloudflare prerequisite does not require configuring `main` as the project's production branch, although TECH assumes `--branch=main` inherently makes a production deployment | [PRODUCT.md invariant 126](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:179), [TECH.md section 7.4](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:838) | Cloudflare determines production versus preview from the project's configured production branch; a successful upload can otherwise become a preview and leave the production hostname stale | BLOCKING

5. TECH says every `verify:build` assertion is driven by `expected-build-output.json`, but the declared schema has no keys for the bundle-secret or base-path assertion families | [TECH.md section 7.1](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:768) | An implementer must either violate the stated uniform activation rule or invent undocumented keys/always-on behavior | non-blocking

6. The universal file/component conventions have undocumented exceptions and a direct filename mismatch | [TECH.md section 1](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:58), [RootErrorBoundary](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:142), [FieldContext](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:597) | A required class component cannot be `memo`-wrapped with a named inner function, and `fieldContext.ts` does not match the named `FieldContext` symbol under the stated exact-name rule | non-blocking

7. The file conventions have no named lint rule, script, or structural test | [TECH.md section 1](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:58), [testing map](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:872) | A kebab-case production module, default-exported route, missing barrel, or anonymous `memo` component can pass the entire specified pipeline | non-blocking

8. The cache withdrawal left contradictory authoritative prose: ARCHITECTURE calls caching “deferred,” while TECH still claims checks 37 and 42 were strengthened despite retiring them | [ARCHITECTURE.md section 4](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/ARCHITECTURE.md:78), [TECH.md review-dependent audit](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:1025) | A later phase can reasonably interpret caching as deferred work, and the audit inaccurately claims checks that no longer exist | non-blocking

## A. Cache withdrawal

Findings 3 and 8 apply.

Otherwise the withdrawal is complete across PRODUCT and TECH:

- No `platform/cache` layout entry remains.
- Runtime construction, M3 deliverables, coverage, size limits, risks, and the testing map contain no active cache work.
- Retired-number references in the explicit withdrawal/history sections are legitimate.
- The storage rehome retains `localStorage`, `sessionStorage`, and `indexedDB`, but loses mechanical enforcement for service-worker caches through `caches`.

## B. Cloudflare move

- CSP split: the architecture is valid. `frame-ancestors` must be an HTTP header, while the remaining policy can stay in the meta tag. Cloudflare documents `_headers` as applying response headers to matching static assets. The exclusivity requirement is described but not adequately asserted - finding 1. [Cloudflare `_headers` documentation](https://developers.cloudflare.com/pages/configuration/headers/)
- Declaration table: fail-open and internally incomplete - findings 2 and 5.
- Base path: coherent. `environment.ts` remains the sole `import.meta.env` reader; `BASE_URL` becomes `configuration.basePath`; the router and root-boundary recovery consume it. No operative sub-path assumption remains.
- Preview deployments: invariant 121 is coherent because this is a Direct Upload project without Git integration and the PR workflow never invokes Wrangler. Cloudflare previews are created only when an upload targets a non-production branch; no PR upload is specified. [Cloudflare Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)
- Post-merge proof: M6 honestly states that invariants 123/124 cannot be proven on the PR and must run after merge. The phase cannot truthfully close before that deployed smoke passes.
- Missing setup: absent project/secrets blocks M6 at the Wrangler step. A wrong production-branch setting is worse because deployment may succeed to a preview - finding 4.
- Security: `_headers` with a `/*` scope is sound for this static, Functions-free app, and the live header assertion is the necessary final proof. The token is correctly described as a repository secret with Cloudflare Pages Edit only, consistent with Cloudflare guidance and invariant 133. [Cloudflare Pages API tokens](https://developers.cloudflare.com/pages/configuration/api/)

## C. File conventions

They are applied broadly across the proposed tree, route adapters, kit components, tests, and build-output files, but are not fully consistent.

- `environment.ts` and non-module/config/test files are documented.
- `RootErrorBoundary` needs another explicit exception to the universal `memo` rule.
- `fieldContext.ts` contradicts the stated exact symbol-to-filename rule if the exported symbol is `FieldContext`.
- Enforcement is prose/review-only; no convention check is mapped.

## D. Cross-amendment interactions

- Storage versus deployment: sound except for finding 3. `_redirects` avoids any `sessionStorage`-based SPA fallback.
- Size budget: sound. Removing cache only reduces application weight; the dependency estimate and measured entry-plus-vendor definition do not assume cache weight.
- Build-output runner: soundly separated into `vitest.build-output.config.ts`, after `build`; tests cannot be accidentally collected by default Vitest projects.
- M5 dependencies: soundly sequential and M5 owns `_redirects`, `_headers`, route/catalogue chunks, and table population. The remaining defect is that table population is not fail-closed.

## E. Testability

- 99: discriminating unit and browser assertions cover required meta directives and forbid `frame-ancestors`.
- 99a: missing or mis-scoped `/*` is intended to fail; live delivery is checked. Extra header directives still pass - finding 1.
- 100: development and production browser projects plus exact console expectations are discriminating.
- 103: workflow ordering and post-build execution are checked, but declaration activation can silently disappear - findings 2 and 5.
- 112: size-limit and configuration-value assertions fail for missing chunks or raised/breached limits. Cache withdrawal causes no hole.
- 128: fails for three globals but passes for `caches.open` - finding 3.
- 120: workflow parsing checks `needs: verify`, artifact reuse, and no rebuild.
- 121: PR run proves absence of the deploy job; Direct Upload avoids automatic PR previews.
- 122: build-output URL scanning plus browser request recording catches stale sub-paths.
- 123: discriminating live root-route check, necessarily post-merge.
- 124: exact `_redirects` content plus live `/login` load/reload and status 200 are discriminating.
- 125: only configuration presence is mechanical; runtime race behavior remains honestly review-dependent.
- 126: manual review only, with the production-branch prerequisite missing - finding 4.
- File conventions: review-only and internally inconsistent - findings 6 and 7.

The repository on disk is still the stated near-empty Vite starter: no Phase 1 implementation, Cloudflare files, CI workflow, build-output tests, or verification profile exists yet. No files were modified and no implementation suite was claimed or run.


Codex session ID: 019ffa93-f0b5-7f11-94f7-58327e9f4862
Resume in Codex: codex resume 019ffa93-f0b5-7f11-94f7-58327e9f4862
