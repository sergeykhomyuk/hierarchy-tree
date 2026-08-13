import { memo } from 'react';

// No user-visible string yet - wired into the real provider stack
// (ApplicationRoot) since M5 step 29, but the router itself only becomes
// reachable from the build's entry graph at step 31, which is also where
// build-output/expected-build-output.json's declaration table is armed to
// expect the route chunks that wiring produces. Until then, this stands in
// for whatever RouterProvider will render. A data-testid, not a visible
// heading, is what M1's own test covers (invariant 60).
const StartupPlaceholder = memo(function StartupPlaceholder() {
  return <main data-testid="startup-placeholder" />;
});

export { StartupPlaceholder };
