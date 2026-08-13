import { createElement } from 'react';
import type { i18n } from 'i18next';
import type { RouteObject } from 'react-router';
import { ApplicationLayout } from '../layout/ApplicationLayout';
import { RouteErrorBoundary } from '../error-boundary/RouteErrorBoundary';

// Each lazy() awaits its feature's own loadTranslations(instance) before
// resolving, so a route never renders before its namespace is registered
// (invariant 62). No loader, no guard, no redirect - this phase's routes
// resolve to a component and nothing else (invariant 97).
export function routeDefinitions(instance: i18n): RouteObject[] {
  return [
    {
      path: '/',
      element: createElement(ApplicationLayout),
      ErrorBoundary: RouteErrorBoundary,
      children: [
        {
          index: true,
          lazy: async () => {
            const [{ HomeRoute }, { loadTranslations }] = await Promise.all([
              import('./routes/HomeRoute'),
              import('@features/hierarchy'),
            ]);
            await loadTranslations(instance);
            return { Component: HomeRoute };
          },
        },
        {
          path: 'login',
          lazy: async () => {
            const [{ LoginRoute }, { loadTranslations }] = await Promise.all([
              import('./routes/LoginRoute'),
              import('@features/auth'),
            ]);
            await loadTranslations(instance);
            return { Component: LoginRoute };
          },
        },
        {
          path: '*',
          lazy: async () => {
            const { NotFoundRoute } = await import('./routes/NotFoundRoute');
            return { Component: NotFoundRoute };
          },
        },
      ],
    },
  ];
}
