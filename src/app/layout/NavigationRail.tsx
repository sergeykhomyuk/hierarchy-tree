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
      className="sticky top-0 h-screen w-[60px] shrink-0 bg-nav-rail"
    >
      <div className="flex h-[60px] items-center justify-center bg-primary">
        <span className="h-4 w-4 rounded-[5px] bg-on-primary" />
      </div>
      <div className="flex flex-col items-center gap-[18px] pt-[22px]">
        {[0, 1, 2, 3].map((item) => (
          <span
            key={item}
            className="h-[26px] w-[26px] rounded-full bg-white/10 first:bg-white/15"
          />
        ))}
      </div>
    </div>
  );
});
