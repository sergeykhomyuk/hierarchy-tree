import { memo } from 'react';

// Decorative only - no link, no button, no focusable element, hidden from
// assistive technology entirely (invariant 92). It renders in the
// authenticated shell rather than the hierarchy page itself, so it appears
// on every authenticated page, not only this one.
export const NavigationRail = memo(function NavigationRail() {
  return (
    <div
      aria-hidden="true"
      className="w-16 shrink-0 border-e border-border-hairline"
    />
  );
});
