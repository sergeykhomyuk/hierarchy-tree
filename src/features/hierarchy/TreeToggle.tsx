import { memo } from 'react';

export type TreeToggleProps = {
  isExpanded: boolean;
  onToggle: () => void;
};

// Reached through its row, never through Tab (invariant 107): tabIndex
// -1 keeps it out of the tab sequence, and aria-hidden keeps it out of a
// screen reader's own browse-mode discovery too - the row's own explicit
// accessible name and its future keyboard handling (M4) are the one path
// assistive technology uses, so this stays a mouse-only affordance
// rather than a second, redundant interactive element per row.
export const TreeToggle = memo(function TreeToggle({
  isExpanded,
  onToggle,
}: TreeToggleProps) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden="true"
      onClick={onToggle}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-control border border-border-hairline text-ink-muted"
    >
      {isExpanded ? '−' : '+'}
    </button>
  );
});
