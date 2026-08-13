import { createElement } from 'react';
import type { i18n } from 'i18next';
import type { RouteObject } from 'react-router';
import { ApplicationLayout } from '../layout/ApplicationLayout';
import { RouteErrorBoundary } from '../error-boundary/RouteErrorBoundary';

// Each lazy() awaits its feature's own loadTranslations(instance) before
// resolving, so a route never renders before its namespace is registered
// (invariant 62). No loader, no guard, no redirect - this phase's routes
// resolve to a component and nothing else (invariant 97).
export function routeDefinitions(
  instance: i18n,
  developmentRoutes: boolean,
): RouteObject[] {
  const children: RouteObject[] = [
    {
      index: true,
      lazy: async () => {
        const { HomeRoute, loadTranslations } =
          await import('./routes/HomeRoute');
        await loadTranslations(instance);
        return { Component: HomeRoute };
      },
    },
    {
      path: 'login',
      lazy: async () => {
        const { LoginRoute, loadTranslations } =
          await import('./routes/LoginRoute');
        await loadTranslations(instance);
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
  if (import.meta.env.DEV && developmentRoutes) {
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
