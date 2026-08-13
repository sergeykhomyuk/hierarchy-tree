import { memo } from 'react';

// No product behavior yet - a bare shell so the layer and the boundary
// rules that reference it have something real to check against. M5
// replaces this body with the real placeholder page (invariant 9).
const AuthPlaceholderPage = memo(function AuthPlaceholderPage() {
  return null;
});

export { AuthPlaceholderPage };
