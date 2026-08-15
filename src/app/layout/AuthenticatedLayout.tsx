import { memo } from 'react';
import { Outlet } from 'react-router';

// The header (M4) renders here, above the outlet; M3 adds only the route
// that will hold it.
export const AuthenticatedLayout = memo(function AuthenticatedLayout() {
  return <Outlet />;
});
