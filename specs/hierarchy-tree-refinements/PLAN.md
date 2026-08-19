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
5. `HierarchyTree` delegates roving focus, toggle orchestration, announcements, and keyboard composition to a feature-specific interaction hook without changing observable behavior.
6. The extracted interaction hook has focused coverage for its defensive empty-row and missing-row branches.

## Steps

1. Add a component regression test proving focus-only renders reuse both derived arrays, then memoize `rows` and `accessibleNames` and update comments whose freshness claims become obsolete.
   - `src/features/hierarchy/HierarchyTree.test.tsx::memoizes visible rows and accessible names across a focus-only render`
2. Extract the existing focus, toggle, announcement, and keyboard orchestration into `useHierarchyTreeInteractions`, keeping `useTreeKeyboard` as the focused keyboard interpreter and preserving the component test contract.
   - `src/features/hierarchy/HierarchyTree.test.tsx::the row that receives focus becomes the tabbable row, and the rest fall out of the tab sequence`
   - `src/features/hierarchy/HierarchyTree.test.tsx::collapsing the branch containing the tabbable row leaves exactly one still-rendered row tabbable`
   - `src/features/hierarchy/HierarchyTree.test.tsx::clicking a toggle emits one telemetry event carrying the new state and the row's depth, with no name, email or person id`
   - `src/features/hierarchy/HierarchyTree.test.tsx::a keyboard-driven toggle leaves a row under a different root unrendered`
3. Add focused hook tests for the two defensive branches that are not reachable through ordinary rendered-row interaction.
   - `src/features/hierarchy/useHierarchyTreeInteractions.test.tsx::useHierarchyTreeInteractions > delegates a missing-row toggle without telemetry or an announcement`
   - `src/features/hierarchy/useHierarchyTreeInteractions.test.tsx::useHierarchyTreeInteractions > clears the tab stop when the visible row list becomes empty`

## Verification

- `npm run test -- src/features/hierarchy/HierarchyTree.test.tsx`
- `npm run verify`
