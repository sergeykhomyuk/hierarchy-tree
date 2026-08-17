import { memo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  LoginPage,
  loadTranslations,
  resolveDestination,
} from '@features/auth';
import { useRuntime } from '../../composition';

export const LoginRoute = memo(function LoginRoute() {
  const runtime = useRuntime();
  const routerNavigate = useNavigate();
  const [searchParams] = useSearchParams();
  const destination = resolveDestination(searchParams.get('from'));

  // react-router's navigate() returns void | Promise<void>; LoginPage's
  // dependency wants a plain void callback, so this discards whichever
  // one comes back rather than passing the union through.
  const navigate = useCallback(
    (nextDestination: string, options: { replace: boolean }) => {
      void routerNavigate(nextDestination, options);
    },
    [routerNavigate],
  );

  return (
    <LoginPage
      dependencies={{
        http: runtime.http,
        observability: runtime.observability,
        tabStorage: runtime.tabStorage,
        beginInteraction: runtime.interactionTracker.beginInteraction,
        endInteraction: runtime.interactionTracker.endInteraction,
        navigate,
      }}
      destination={destination}
    />
  );
});

export { loadTranslations };
