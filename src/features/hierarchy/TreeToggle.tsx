import { memo } from 'react';
import type { MouseEvent } from 'react';

export type TreeToggleProps = {
  isExpanded: boolean;
  onToggle: () => void;
};

function preventMouseDownFocus(event: MouseEvent<HTMLButtonElement>): void {
  event.preventDefault();
}

// Reached through its row, never through Tab (invariant 107): tabIndex
// -1 keeps it out of the tab sequence, and aria-hidden keeps it out of a
// screen reader's own browse-mode discovery too - the row's own explicit
// accessible name and its future keyboard handling (M4) are the one path
// assistive technology uses, so this stays a mouse-only affordance
// rather than a second, redundant interactive element per row. tabIndex
// -1 alone only blocks reaching it with Tab - a browser still focuses a
// tabIndex="-1" element on mousedown by default, which would otherwise
// race the M4 focus-recovery effect (invariant 143) for who ends up
// holding focus after a click-triggered collapse; preventing mousedown's
// default action here means the button is never a focus candidate at
// all, mouse or keyboard.
export const TreeToggle = memo(function TreeToggle({
  isExpanded,
  onToggle,
}: TreeToggleProps) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden="true"
      onMouseDown={preventMouseDownFocus}
      onClick={onToggle}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-control border border-border-hairline text-ink-muted"
    >
      {isExpanded ? '−' : '+'}
    </button>
  );
});
