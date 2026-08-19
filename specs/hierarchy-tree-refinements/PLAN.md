# Hierarchy tree refinements

## Brief

Keep a persistent S-sized refactor loop for small, behavior-preserving hierarchy-tree improvements. The first refinement memoizes the visible-row model and its accessible-name projection so focus-only and announcement-only renders do not repeat unchanged derivations.

## Behavior-preservation contract

- Rendered rows, their order, and their ARIA attributes remain unchanged.
- Expansion, keyboard navigation, focus recovery, announcements, and telemetry remain unchanged.
- Accessible names continue to update when rows, the signed-in user, or the translated you-marker label changes.
- A genuine expansion change still recomputes the visible rows and accessible names.

## Acceptance criteria

1. A focus-only render with stable `roots` and `expandedIds` does not call `flattenVisible` again.
2. The same focus-only render does not recompute row accessible names.
3. The existing `HierarchyTree` component suite and the repository verification gate remain green.
4. The loop stays active after this step so later hierarchy-tree refinements can be added.

## Steps

1. Add a component regression test proving focus-only renders reuse both derived arrays, then memoize `rows` and `accessibleNames` and update comments whose freshness claims become obsolete.
   - `src/features/hierarchy/HierarchyTree.test.tsx::memoizes visible rows and accessible names across a focus-only render`

## Verification

- `npm run test -- src/features/hierarchy/HierarchyTree.test.tsx`
- `npm run verify`

