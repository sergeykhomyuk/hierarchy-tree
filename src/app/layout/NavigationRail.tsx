import { memo } from 'react';

// Decorative only - no link, no button, no focusable element, hidden from
// assistive technology entirely (invariant 92). It renders in the
// authenticated shell rather than the hierarchy page itself, so it appears
// on every authenticated page, not only this one.
//
// h-screen and sticky rather than the flex row's default stretch: a
// sibling that only stretches to match <Outlet />'s height would grow
// taller the moment the hierarchy card's own content grows (the loading
// skeleton is shorter than a populated tree), which is exactly the
// bounding-box change invariant 64 forbids.
export const NavigationRail = memo(function NavigationRail() {
  return (
    <div
      aria-hidden="true"
      data-testid="navigation-rail"
      className="sticky top-0 h-screen w-16 shrink-0 border-e border-border-hairline"
    />
  );
});
