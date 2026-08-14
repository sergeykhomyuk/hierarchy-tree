# G1 Codex second opinion - phase-1-setup

Invocation: codex exec --sandbox read-only, model gpt-5.6-sol, fresh thread, 2026-08-13.
Brief: read-only spec review of PRODUCT.md + TECH.md against ARCHITECTURE.md/ROADMAP.md/GOAL.md and the real repo.
Verified by inspection: the transcript shows it read the spec files, package.json, tsconfig, eslint.config.js,
node_modules sources, live npm registry metadata, and ran an in-memory TypeScript compilation.

## Verdict and findings (verbatim)

16 findings (12 blocking)

1. Caller cancellation has no legal result in the four-member `HttpResult` contract | PRODUCT.md invariants 25, 33, 34 / TECH.md section 3.2 | PRODUCT says caller abort is not an application error ([PRODUCT.md:53](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:53)) while TECH permits only `network`, `timeout`, `http`, or `parse` failures ([TECH.md:352](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:352)) and merely says cancellation “returns” ([TECH.md:367](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:367)); an aborted request must therefore be misclassified, escape as a platform error, or violate the result type. | BLOCKING

2. The injected clock cannot implement the specified deadline without immediately aborting every fake-transport request | TECH.md section 3.2 / section 6.1 | The clock exposes only `now()` and `sleep()` ([TECH.md:332](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:332)), deadlines are driven through it ([TECH.md:365](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:365)), but the fake clock’s `sleep` resolves instantly ([TECH.md:582](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:582)); a `sleep(timeout).then(abort)` implementation fires before the transport completes, and no cancellable scheduler API is specified. | BLOCKING

3. The cache entry shape cannot represent the initial in-flight request that invariant 38 requires it to deduplicate | PRODUCT.md invariant 38 / TECH.md section 3.3 | TECH defines an entry only after it has `{ value, storedAtMilliseconds, revalidation? }` ([TECH.md:377](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:377)) and then claims an in-flight promise is stored “on the entry before the first await” ([TECH.md:378](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:378)); on a cold miss there is no value-bearing entry, so concurrent first reads cannot follow the stated design. | BLOCKING

4. Invalidation has no generation or cancellation semantics, allowing an invalidated request to repopulate the cache later | PRODUCT.md invariant 42 / TECH.md section 3.3 | PRODUCT requires key invalidation and whole-cache clearing ([PRODUCT.md:73](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:73)), while TECH specifies only `Map`, `invalidate`, and `clear` ([TECH.md:376](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:376), [TECH.md:381](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:381)); a load or revalidation resolving after invalidation can restore the deleted value. | BLOCKING

5. Failed revalidation changes the freshness timestamp and therefore presents stale data as fresh | PRODUCT.md invariants 37, 41 / TECH.md section 3.3 | PRODUCT says failed revalidation “leaves the stale value in place” ([PRODUCT.md:72](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:72)), but TECH refreshes `storedAtMilliseconds` for a cooldown ([TECH.md:380](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:380)); because that timestamp is the sole freshness input ([TECH.md:379](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:379)), subsequent reads classify failed stale data as fresh. | BLOCKING

6. The missing-translation marker is assigned to the wrong i18next hook | PRODUCT.md invariant 63 / TECH.md section 3.5 | TECH says `missingKeyHandler` returns `⟦key⟧` ([TECH.md:406](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:406)), but i18next documents `missingKeyHandler` as a notification callback and `parseMissingKeyHandler` as the hook whose return value is displayed; development would still fall back to the key, contrary to PRODUCT’s “not a silent fallback” requirement ([PRODUCT.md:100](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:100)). | BLOCKING

7. The locale-direction code does not typecheck under the repository’s specified TypeScript libraries | TECH.md section 3.5 | TECH calls `new Intl.Locale(language).getTextInfo()` ([TECH.md:408](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:408)), while `tsconfig.app.json` includes `ES2023` and `DOM` only ([tsconfig.app.json:4](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/tsconfig.app.json:4)); TypeScript 6.0.3 declares `getTextInfo` only in `lib.esnext.intl.d.ts`, and an in-memory compilation produced `Property 'getTextInfo' does not exist on type 'Locale'.` | BLOCKING

8. The production CSP forbids the inline dimensions required by `Skeleton` | PRODUCT.md invariants 76, 99, 100 / TECH.md sections 4.3 and 5.6 | Production uses `style-src 'self'` without inline styles ([TECH.md:553](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:553)), while the mapped Skeleton test requires width and height as inline styles ([TECH.md:770](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:770)); the browser blocks those declarations and emits the CSP violation invariant 100 forbids. | BLOCKING

9. M1 cannot pass `npm run verify` because that command includes the size gate whose configuration is deferred to M6 | TECH.md milestone split | `verify` chains all seven gates including `size` ([TECH.md:602](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:602)), M1 claims `npm run verify` passes ([TECH.md:661](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:661)), but `.size-limit.json` and the first size run arrive only in M6 ([TECH.md:677](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:677)); the first milestone borrows a later harness. | BLOCKING

10. The error deduplication mechanism fails for primitive thrown values | PRODUCT.md invariants 91, 92 / TECH.md section 5.4 | PRODUCT covers any route render throw or loader rejection ([PRODUCT.md:134](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:134)), but TECH stores errors in `WeakSet<object>` ([TECH.md:542](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:542)); `throw null`, `throw 'failed'`, or a loader rejection with a primitive makes `WeakSet` access throw inside the boundary. | BLOCKING

11. The observability no-throw guarantee protects only the sink, not the preceding redaction traversal | PRODUCT.md invariant 59 / TECH.md section 3.4 | Redaction runs before the sink and traverses arbitrary nested input ([TECH.md:394](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:394)), but the promised catch wraps “the sink call” ([TECH.md:398](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:398)); a throwing getter, proxy, or recursion overflow can escape before the sink catch, violating “Observability calls never throw” ([PRODUCT.md:93](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:93)). | BLOCKING

12. The proposed Size Limit file omits the option that the surrounding prose says every entry sets | TECH.md section 7.3 | The literal `.size-limit.json` has no `"running": false` ([TECH.md:622](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:622)), while the next paragraph says entries set it ([TECH.md:637](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:637)); `@size-limit/preset-app` includes its browser timing plugin, so following the shown configuration can execute code rather than merely measure the built files. | non-blocking

13. The RTL e2e procedure resets the very state it intends to inspect | PRODUCT.md invariant 68 / TECH.md testing map | TECH says application startup derives `dir` from active English and writes `ltr` ([TECH.md:408](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:408)), but its check says to set `dir="rtl"` and then reload ([TECH.md:760](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:760)); without a pre-navigation/init-script override, reload restores LTR and the test examines the wrong direction. | non-blocking

14. The “everything else has a check that fails” classification materially overstates the mapped tests | TECH.md Testing and validation | TECH makes that claim at [TECH.md:840](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:840), yet examples outside its review list include storage emptiness standing in for “no second cache” ([TECH.md:731](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:731)), prop presence standing in for no layout shift ([TECH.md:770](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:770)), and a vocabulary grep standing in for absence of login, session, hierarchy, and repository behavior ([TECH.md:830](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:830)); broken implementations can pass all three. | BLOCKING

15. `Button` busy state does not specify suppression of the native default action | PRODUCT.md invariant 80 / TECH.md section 4.3 | TECH keeps a busy button enabled and only ignores `onClick` ([TECH.md:474](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:474)); for `type="submit"`, keyboard or pointer activation can still submit its containing form unless the component also prevents the default action. | non-blocking

16. The binding architecture calls the system “Three layers” while naming four | PRODUCT.md invariant 1 / ARCHITECTURE.md section 2 | PRODUCT requires exactly `app`, `features`, `shared`, and `platform` ([PRODUCT.md:23](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:23)), while binding ARCHITECTURE says “Three layers” before diagramming those same four ([ARCHITECTURE.md:16](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/ARCHITECTURE.md:16)); this appears editorial but should not remain in a document declared fully binding. | non-blocking

Completeness

Incomplete.

- HTTP does not define cancellation as a typed outcome, pre-aborted signals, caller abort during retry sleep, timeout/caller race precedence, deadline cleanup, or whether the deadline is per attempt or per logical request. Attempt numbering is also ambiguous between the zero-based `attempt < 1` policy and user-facing telemetry.
- Cache needs separate states for cold in-flight load, stored value, and revalidation; generation tokens for `invalidate`/`clear`; a distinct revalidation cooldown timestamp; and a decision for invalidate-then-read while the earlier load is still resolving.
- Observability needs a defined cycle/repeated-reference representation, a maximum traversal policy, protection around the whole redact-and-dispatch path, chronological `read()` behavior after ring wrap, and treatment of URL-like relative strings.
- Lazy i18n needs the i18next instance ownership/passing contract, concurrent-load dedupe, retry after a failed dynamic import, idempotent `addResourceBundle`, and the correct displayed-missing-key hook. TECH’s claim that Rollup puts JSON “into that route’s chunk” ([TECH.md:405](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:405)) is stronger than Rollup guarantees; it may emit an additional lazy JSON chunk.

Internal consistency

The three highlighted decisions are consistent:

- `web-vitals` is recorded in ARCHITECTURE ([ARCHITECTURE.md:167](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/ARCHITECTURE.md:167)) and included in invariant 134’s exact allow-list ([PRODUCT.md:189](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:189)).
- Meta-CSP omission of `frame-ancestors` agrees across ARCHITECTURE ([ARCHITECTURE.md:168](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/ARCHITECTURE.md:168)), PRODUCT ([PRODUCT.md:143](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:143)), and TECH.
- The 100 kB entry budget agrees across ARCHITECTURE ([ARCHITECTURE.md:169](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/ARCHITECTURE.md:169)), PRODUCT ([PRODUCT.md:159](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/PRODUCT.md:159)), and TECH.

The material inconsistencies are findings 1, 3, 5, 8, 9, and 12. Two editorial counts are also stale: TECH says PRODUCT has 136 invariants ([TECH.md:18](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:18)), although the actual total is 139 after 96a, 116a, and 116b.

Feasibility

VERIFIED (from source):

- Live npm registry queries confirmed all asserted exact releases exist: ESLint 10.8.1, boundaries 7.2.0, typescript-eslint 8.67.0, Vitest and coverage 4.1.10, Tailwind 4.3.3, React Router 8.3.0, Zod 4.4.3, i18next 26.3.6, Playwright 1.62.1, Size Limit 13.0.3, and web-vitals 6.1.0.
- The lock currently resolves ESLint 10.8.1, typescript-eslint 8.67.0, TypeScript 6.0.3, and Zod 4.4.3. `~6.0.2` in [package.json:26](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/package.json:26) is a patch range, not an exact 6.0.2 pin.
- typescript-eslint 8.67.0 declares ESLint 10 and TypeScript `<6.1` support. The named core ESLint rules exist in installed ESLint 10.8.1.
- Zod 4.4.3 exposes `z.url()` in both classic and mini builds.
- React Router 8 provides `createBrowserRouter(routes, { basename })` and lazy route modules. [Official API](https://api.reactrouter.com/v8/functions/react-router.createBrowserRouter.html)
- Tailwind provides top-level `@theme` variables and generated utilities. [Official Tailwind documentation](https://tailwindcss.com/docs/theme)
- Vitest supports glob-specific coverage thresholds. [Official Vitest configuration](https://v3.vitest.dev/config/)
- web-vitals exports `onLCP`, `onINP`, and `onCLS` from the standard build. [Official package documentation](https://github.com/GoogleChrome/web-vitals)
- Size Limit supports `gzip`, `running`, and `webpack`, but `preset-app` contains file and time plugins, not webpack. [Official Size Limit documentation](https://github.com/ai/size-limit)
- boundaries 7.2.0 still exports the old `element-types`, `no-unknown`, and `entry-point` rules, but `element-types` and `no-unknown` are deprecated; the current canonical rule is `boundaries/dependencies`. [Current rules documentation](https://www.jsboundaries.dev/docs/rules/)

Not confirmed:

- Vitest 4.1.10’s behavior for a threshold glob matching no files. TECH itself defers this to M3 ([TECH.md:850](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:850)); the package is not installed and the repository is read-only.
- Size Limit 13.0.3’s claimed empty-glob failure behavior and the actual 100 kB dependency estimate. The package is not installed and no build exists.
- `eslint-plugin-i18next` 6.1.5’s exact `ignoreAttribute` option shape; its registry README did not document those options.
- GitHub Pages’ deployed 404 fallback in this repository, because no deployment or built `404.html` exists yet.
- The proposed bundle chunk names and sizes, because implementation and build output do not exist.

Testability

The mapping is not yet honest or complete.

Additional review-dependent or non-discriminating invariants include:

- 21: the listed rules do not cover `globalThis.fetch`, aliased globals, WebSocket, or all “equivalent” transports.
- 37: asserting that two paths call an exported freshness helper tests implementation structure, not that loader and component decisions actually agree.
- 55-56: the mapped payload tests each sensitive key once, not “each key at several depths,” and do not exercise cycles or shared references.
- 58: the Playwright handler permits same-origin traffic, so a sink that posts telemetry back to the app origin can pass.
- 68: the RTL procedure is ineffective as written.
- 76: required width and height props do not prove the replacement content has identical geometry or zero layout shift.
- 87: “every documented state” requires a maintained state inventory; jsdom dark `matchMedia` does not apply browser media-query layout, and axe in jsdom does not establish visual dark-theme behavior.
- 115: injection seams do not prove that no test uses wall-clock timers.
- 122: inspecting `dist/index.html` and `/assets/` references does not prove every runtime route or constructed URL stays under the base.
- 125: parsing the concurrency configuration proves configuration presence, not supersession behavior.
- 127-130 and 133: vocabulary and entropy greps are heuristics and can pass renamed, concatenated, encoded, or otherwise equivalent forbidden behavior.

Those should either receive behaviorally discriminating checks or be added to the review-dependent list. The current list at [TECH.md:840](/Users/sergeykhomyuk/System/Areas/Dev/github/hierarchy-tree/specs/phase-1-setup/TECH.md:840) is therefore incomplete.

Milestone split

- M1 -> M2: M2 legitimately uses the lint and evidence harness installed in M1.
- M2 -> M3: M3 legitimately uses Vitest and coverage from M1 and boundary enforcement from M2.
- M1 -> M4: valid; Tailwind, Vitest, jsdom, and axe are intended to exist in M1.
- {M3, M4} -> M5: valid in principle; M5 uses platform adapters from M3, UI kit from M4, and Playwright from M1.
- M5 -> M6: valid for CI/deployment assembly, but M6 cannot be closed entirely on the pull request because deployment only occurs after a push to `main`.
- M1 itself is not verifiable as claimed: `npm run verify` invokes the M6 size gate before its configuration exists. Either M1 needs an explicit temporary/full size configuration, `verify` must omit `size` until M6, or `.size-limit.json` must move to M1.

No files were modified. No implementation suites were run because the implementation and harness do not exist; verification consisted of repository reads, installed-source inspection, live registry metadata, official API documentation, and an in-memory TypeScript compilation.
