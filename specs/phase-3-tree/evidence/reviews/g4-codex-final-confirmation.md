1. RESOLVED - Avatar.tsx:38 resets `imageFailed` when `resetToken` changes, HierarchyTree.tsx:239 supplies the payload-specific `roots`, HierarchyTree.test.tsx:304 verifies retry using the same mounted instance.

2. NOT RESOLVED - `expandedIds` still changes on every toggle and remains a dependency of `expandMany` (useExpansion.ts:129), cascading through HierarchyTree.tsx:187 into every row's `onKeyDown`; the render-count test still substitutes a stable callback (HierarchyTree.test.tsx:59) rather than exercising the real identity churn.

3. RESOLVED - parsePeople.ts:46 records each failure's position and fields; fetchPeople.ts:100 reports those details for all-invalid payloads as well as partial drops.

4. PARTIALLY RESOLVED - useExpansion.ts:77 now reports skipped segments, but the app is wrapped in `StrictMode` (bootstrap.ts:69), so the effect will fire twice on an initial dev mount, violating invariant 121's "once per parse" requirement.

5. RESOLVED - useExpansion.ts:85 filters expansion through manager IDs before toggle serialization, eliminating the childless-root leak; covered by useExpansion.test.tsx:220.

6. PARTIALLY RESOLVED - Documented in PRODUCT.md:724 and ARCHITECTURE.md:201, but invariant 3 still says the header is unmodified (PRODUCT.md:52), and loop.json:926 still claims nine deviations, contradicting invariant 185's eleven-count agreement.

Verdict: 3 of 6 fully resolved.
