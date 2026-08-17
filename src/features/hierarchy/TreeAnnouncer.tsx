import { memo } from 'react';

export type TreeAnnouncerProps = {
  message: string;
};

// aria-live/aria-atomic directly, not role="status" - the loading
// indicator (HierarchySkeleton.tsx) already owns that role for this page,
// and this element stays mounted (empty) before any toggle ever happens,
// which would otherwise make "no status role once the data has loaded"
// checks see a stray, content-less status region. Present continuously
// rather than only once a message exists: a live region inserted into the
// DOM at the same moment its content is set is not reliably announced by
// assistive technology, which needs to already be watching the node
// before it changes (invariant 114). Visually hidden since the toggle
// glyph and the row's own aria-expanded already carry this information
// for a sighted user.
export const TreeAnnouncer = memo(function TreeAnnouncer({
  message,
}: TreeAnnouncerProps) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      data-testid="tree-announcer"
      className="sr-only"
    >
      {message}
    </div>
  );
});
