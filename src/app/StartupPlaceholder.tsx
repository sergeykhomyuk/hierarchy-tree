import { memo } from 'react';

// No user-visible string yet - the i18next catalogue system arrives in
// M3/M5. A data-testid, not a visible heading, is what M1's own test
// covers (invariant 60).
const StartupPlaceholder = memo(function StartupPlaceholder() {
  return <main data-testid="startup-placeholder" />;
});

export { StartupPlaceholder };
