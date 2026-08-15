import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import '@shared/testing/toHaveNoAxeViolations';
import {
  HierarchyPlaceholderPage,
  loadTranslations as loadHierarchyTranslations,
} from '@features/hierarchy';
import { ApplicationRoot } from './ApplicationRoot';
import { ApplicationLayout } from './layout/ApplicationLayout';
import { buildTestRuntime } from './testing/renderRoute';

describe('feature slices', () => {
  it('the hierarchy placeholder exists and exports its documented name', () => {
    expect(HierarchyPlaceholderPage).toBeDefined();
  });

  it('the hierarchy placeholder exposes one h1 inside a main landmark and passes axe', async () => {
    const runtime = await buildTestRuntime();
    await loadHierarchyTranslations(runtime.i18n);
    const router = createMemoryRouter([
      {
        path: '/',
        element: <ApplicationLayout />,
        children: [{ index: true, element: <HierarchyPlaceholderPage /> }],
      },
    ]);

    const { container } = render(
      <ApplicationRoot runtime={runtime}>
        <RouterProvider router={router} />
      </ApplicationRoot>,
    );

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(screen.getByRole('main')).toContainElement(headings[0] ?? null);
    await expect(container).toHaveNoAxeViolations();
  });
});
