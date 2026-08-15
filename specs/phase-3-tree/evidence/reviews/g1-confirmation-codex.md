# G1 - Codex confirmation of its own findings (verbatim)

Resumed Codex session `01a004b7-0c27-7392-a6de-85123cd8b4a0` - the thread that raised the
findings, per the contract's rule that the raiser confirms its own fixes.

---

14 of 17 resolved, 1 not resolved, 2 partially resolved.

1. RESOLVED - PRODUCT invariant 124 and TECH §3 add `shouldRevalidate` to both authenticated and index routes for `expanded`-only changes, preventing refetch and rebuild.

2. RESOLVED - PRODUCT invariant 51 explicitly limits the password guarantee to parsed objects, outputs, storage, fixtures and telemetry, acknowledging the unavoidable raw JSON materialization.

3. RESOLVED - PRODUCT invariants 4 and 170-172 coherently distinguish the page's single HTTP-client request from browser-managed third-party image loads.

4. RESOLVED - PRODUCT invariant 194 and TECH M1 explicitly retire the three phase-1 tripwires and update their tests before the first verification boundary.

5. PARTIAL - TECH §3 correctly requires `beginInteraction()` before revalidation and `endInteraction()` afterward, and phase 2 exposes both, but `HomeRoute` remains a direct re-export and the named feature dependencies contain only `http`, `observability`, and `clock`; no legal callback/wrapper path carries the app-owned interaction tracker into the component invoking `useRevalidator()`.

6. RESOLVED - PRODUCT invariant 102 replaces the nonexistent Intl person-name requirement with locale-reorderable catalogue interpolation.

7. NOT RESOLVED - The five-milestone rewrite still has forward dependencies: M2 assigns rendering invariants 44 and 49 while explicitly postponing their rendering halves to M3, and M3 assigns invariants 114-115 covering mouse and keyboard toggles while keyboard behavior does not exist until M4.

8. RESOLVED - PRODUCT invariants 97 and 190 plus TECH §6 explicitly widen `Avatar` with a generic exactly-once image-error callback.

9. RESOLVED - PRODUCT invariant 52 and TECH §1 name a concrete branded `EmailAddress` type and parser.

10. RESOLVED - PRODUCT invariants 94 and 138-139 define the matched string, nameless fallback, case/accent behavior, wrapping, buffer reset and repeated-character cycling.

11. RESOLVED - PRODUCT invariants 140-141 define same-parent siblings, one history entry, one aggregate announcement and one telemetry event.

12. RESOLVED - PRODUCT invariants 101 and 185, plus deviation 5, explicitly record the decorative-avatar departure from ARCHITECTURE.

13. RESOLVED - PRODUCT now uses descriptive internal references, removing the stale numeric anomaly citations.

14. PARTIAL - TECH now names render-count, scroll, request/build, photo-error, tab-sequence, POP, width, referrer and chunk-graph checks, but PRODUCT invariant 64's frame/header/nav layout-shift guarantee still has no discriminating bounding-box or Layout Shift test.

15. RESOLVED - PRODUCT invariant 85 explicitly decides that phase 2 string identifiers produce no matching row and no error.

16. RESOLVED - PRODUCT invariant 103 and decision 6 define "N hidden" as the direct-report count.

17. RESOLVED - PRODUCT invariants 118-121 define empty segments, whitespace, unsafe numbers, unknown/non-manager ids, duplicates, mixed validity and repeated parameters; TECH names matching unit cases.

## New problems introduced by the rewrite

- PRODUCT invariant 45 is false twice over. Firebase renders numeric-key data as an array while more than half the keys through the maximum remain populated, so deleting one record from a 33-element collection normally leaves a sparse array with a `null` hole rather than flipping it to an object. The rendered tree also cannot be identical before and after deleting a person. [Firebase's documented array heuristic](https://firebase.googleblog.com/2014/04/best-practices-arrays-in-firebase.html).

- Sparse arrays are not handled coherently. PRODUCT invariants 42-45 discuss contiguous arrays or object maps, while TECH §2 takes an array "as-is"; a Firebase `null` hole would therefore be counted as a malformed row rather than treated as an absent index, producing drop telemetry for an ordinary deletion.

- Cancellation is specified but not wired. PRODUCT invariant 57 requires router cancellation, while TECH's loader/fetch repository never names forwarding `LoaderFunctionArgs.request.signal` into `HttpRequest.signal`, even though `src/platform/http/httpRequest.ts:8` is the existing cancellation seam.

- TECH §4 says a resolved `{ kind: 'cancelled' }` renders "the previous content unchanged", but the proposed `HierarchyPage` merely switches on the new result and owns no previous-result state. An abandoned router load should normally never commit; if `cancelled` does reach the page, the stated rendering is unavailable.

- The injected clock is not currently available to route composition. TECH §3 passes `clock`, but phase 2's `Runtime` exposes only configuration, observability, HTTP, i18n, tracker, storage and signed-user store (`/hierarchy-tree/src/app/composition/createRuntime.ts:32-40,87-95`). Exposing the clock is an additional phase-2/app surface omitted from TECH's claim that exactly two phase-2 surfaces change.

- The decision-log counts contradict each other. PRODUCT's deviation section lists eight entries, TECH §6 says every shared-surface change receives an entry, but M5 schedules "the five decision-log entries".

- PRODUCT invariant 97 requires one photo-failure report per row, while TECH §6 specifies `Avatar.onImageError` once per failed source. A source changing after retry can produce two reports for one row unless the row-level rule wins explicitly.

- Boundary validation accepts any numeric person id under PRODUCT invariant 46, while URL expansion accepts only safe positive integers under invariants 118-119. A valid negative, fractional or unsafe numeric manager could render but could never be represented in a shared expansion URL.

- The claimed mixed-content e2e remains impossible under the current local Playwright configuration, which serves the tested page over `http://127.0.0.1`. That suite can mock a generic image failure, but only an HTTPS page can prove browser mixed-content blocking.

- The analytics declaration-merging mechanism is underspecified. `ObservabilityFacade` imports `AnalyticsPayloads` from `./analyticsEvents`; augmenting the public `@platform/observability` barrel would not merge that originating interface. TECH must name the actual augmentation module or another open-event registration type.

- TECH's boundary test list omits PRODUCT invariant 44's invalid primitive envelopes. It names array, object, `null`, 500, all-invalid and cancellation, but no string, number or boolean parse-failure cases.
