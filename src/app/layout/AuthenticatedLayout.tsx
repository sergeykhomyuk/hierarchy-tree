import { memo, useCallback } from 'react';
import { Outlet, useLoaderData, useNavigate } from 'react-router';
import { useRuntime } from '../composition';
import type { AuthenticatedLoaderData } from './createAuthenticatedLoader';
import { NavigationRail } from './NavigationRail';
import { SignedInHeader } from './SignedInHeader';

// SerializeFrom<T> (react-router's useLoaderData<T>() return type) only
// resolves through a function type, not a plain data type - see
// createAuthenticatedLoader.ts for the loader this mirrors.
type AuthenticatedRouteLoader = () => AuthenticatedLoaderData;

export const AuthenticatedLayout = memo(function AuthenticatedLayout() {
  const runtime = useRuntime();
  const routerNavigate = useNavigate();
  const { signedInUser } = useLoaderData<AuthenticatedRouteLoader>();

  // react-router's navigate() returns void | Promise<void>; SignedInHeader's
  // dependency wants a plain void callback, so this discards whichever one
  // comes back rather than passing the union through (LoginRoute.tsx's own
  // precedent).
  const navigate = useCallback(
    (destination: string, options: { replace: boolean }) => {
      void routerNavigate(destination, options);
    },
    [routerNavigate],
  );

  return (
    <>
      <SignedInHeader
        signedInUser={signedInUser}
        dependencies={{
          observability: runtime.observability,
          tabStorage: runtime.tabStorage,
          beginInteraction: runtime.interactionTracker.beginInteraction,
          navigate,
        }}
      />
      <div className="flex">
        <NavigationRail />
        <Outlet />
      </div>
    </>
  );
});
