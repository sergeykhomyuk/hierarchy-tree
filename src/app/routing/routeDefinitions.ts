import { createElement } from 'react';
import type { LoaderFunctionArgs, RouteObject } from 'react-router';
import { redirectSignedInVisitor } from '@features/auth';
import type { Runtime } from '../composition';
import { ApplicationLayout } from '../layout/ApplicationLayout';
import { RouteErrorBoundary } from '../error-boundary/RouteErrorBoundary';

// Each lazy() awaits its feature's own loadTranslations(instance) before
// resolving, so a route never renders before its namespace is registered
// (invariant 62). The authenticated layout is pathless (invariant 136):
// the route SET stays `/`, `login` and `*` (plus `__kit` in development) -
// a guard adds a wrapper, not a new path.
export function routeDefinitions(runtime: Runtime): RouteObject[] {
  const { i18n, configuration, tabStorage, observability, signedInUserStore } =
    runtime;

  const children: RouteObject[] = [
    {
      id: 'authenticated',
      lazy: async () => {
        const { AuthenticatedLayout, createAuthenticatedLoader } =
          await import('./routes/AuthenticatedRoute');
        return {
          Component: AuthenticatedLayout,
          loader: createAuthenticatedLoader({
            tabStorage,
            observability,
            signedInUserStore,
          }),
        };
      },
      children: [
        {
          index: true,
          lazy: async () => {
            const { HomeRoute, loadTranslations } =
              await import('./routes/HomeRoute');
            await loadTranslations(i18n);
            return { Component: HomeRoute };
          },
        },
      ],
    },
    {
      path: 'login',
      // Cannot be lazy: it must run before the login chunk is fetched, or
      // a signed-in visitor would pay for a chunk they never see.
      loader: ({ request }: LoaderFunctionArgs) =>
        redirectSignedInVisitor({ request, tabStorage, observability }),
      lazy: async () => {
        const { LoginRoute, loadTranslations } =
          await import('./routes/LoginRoute');
        await loadTranslations(i18n);
        return { Component: LoginRoute };
      },
    },
  ];

  // Gated on both the Vite build-time DEV flag, read directly here rather
  // than through environment.ts's re-exported isDevelopmentBuild (that
  // re-export does not fold across the module boundary, so the bundler
  // could not drop the module or its chunk from the production bundle -
  // invariant 86b; see the eslint.config.js override on this file), and
  // the runtime flag (what the configuration schema and e2e suite
  // express). Registered before the wildcard, which would otherwise match
  // `/__kit` first and render not-found instead.
  if (import.meta.env.DEV && configuration.developmentRoutes) {
    children.push({
      path: '__kit',
      lazy: async () => {
        const { KitRoute } = await import('../kit-route/KitRoute');
        return { Component: KitRoute };
      },
    });
  }

  children.push({
    path: '*',
    lazy: async () => {
      const { NotFoundRoute } = await import('./routes/NotFoundRoute');
      return { Component: NotFoundRoute };
    },
  });

  return [
    {
      path: '/',
      element: createElement(ApplicationLayout),
      ErrorBoundary: RouteErrorBoundary,
      // Every child route is lazy(), so the router needs SOMETHING to
      // paint during the first chunk fetch; without it react-router warns
      // "No `HydrateFallback` element provided" on every initial load,
      // which invariant 100's empty console allow-list does not tolerate.
      // Nothing routes to the fallback in a way a user perceives - the
      // chunks are sub-kilobyte - so it renders nothing rather than
      // introducing a designed loading state this phase has no other use
      // for.
      HydrateFallback: () => null,
      children,
    },
  ];
}
