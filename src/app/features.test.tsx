import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { createFakeTransport } from '@shared/testing';
import '@shared/testing/toHaveNoAxeViolations';
import { loadTranslations as loadHierarchyTranslations } from '@features/hierarchy';
import { ApplicationRoot } from './ApplicationRoot';
import { ApplicationLayout } from './layout/ApplicationLayout';
import { HomeRoute } from './routing/routes/HomeRoute';
import { createHierarchyLoader } from './routing/createHierarchyLoader';
import { shouldRevalidateExpansionOnly } from './routing/shouldRevalidateExpansionOnly';
import { buildTestRuntime } from './testing/renderRoute';

describe('feature slices', () => {
  it('the hierarchy route renders through the real stack, inside a main landmark, and passes axe', async () => {
    const transport = createFakeTransport({
      'GET /users.json': () =>
        Promise.resolve(
          new Response(
            JSON.stringify([
              {
                id: 1,
                firstName: 'Ada',
                lastName: 'Lovelace',
                email: 'ada@example.test',
              },
            ]),
            { status: 200 },
          ),
        ),
    });
    const runtime = await buildTestRuntime({}, transport);
    await loadHierarchyTranslations(runtime.i18n);
    const router = createMemoryRouter([
      {
        path: '/',
        element: <ApplicationLayout />,
        children: [
          {
            index: true,
            shouldRevalidate: shouldRevalidateExpansionOnly,
            loader: createHierarchyLoader({
              http: runtime.http,
              observability: runtime.observability,
              interactionTracker: runtime.interactionTracker,
            }),
            element: <HomeRoute />,
          },
        ],
      },
    ]);

    const { container } = render(
      <ApplicationRoot runtime={runtime}>
        <RouterProvider router={router} />
      </ApplicationRoot>,
    );

    expect(await screen.findByText('page.cardTitle')).toBeInTheDocument();
    expect(screen.getByRole('main').textContent).toContain('page.cardTitle');
    await expect(container).toHaveNoAxeViolations();
  });
});
