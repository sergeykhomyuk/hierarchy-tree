// Shared verbatim between HierarchySkeleton and HierarchyTree so the card
// frame's own height never depends on how many rows either one renders
// (invariant 64) - a scrollable region of fixed height, not an outer frame
// that grows and shrinks with the row count of whichever state is showing.
export const ROW_LIST_MAX_HEIGHT_CLASS =
  'h-[calc(100vh-146px)] overflow-x-hidden overflow-y-auto px-[10px] py-1';
