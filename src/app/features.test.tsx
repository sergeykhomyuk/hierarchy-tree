import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import '@shared/testing/toHaveNoAxeViolations';
import {
  AuthPlaceholderPage,
  loadTranslations as loadAuthTranslations,
} from '@features/auth';
import {
  HierarchyPlaceholderPage,
  loadTranslations as loadHierarchyTranslations,
} from '@features/hierarchy';
import { ApplicationRoot } from './ApplicationRoot';
import { ApplicationLayout } from './layout/ApplicationLayout';
import { buildTestRuntime } from './testing/renderRoute';

const PLACEHOLDERS = [
  {
    feature: 'auth',
    Component: AuthPlaceholderPage,
    loadTranslations: loadAuthTranslations,
  },
  {
    feature: 'hierarchy',
    Component: HierarchyPlaceholderPage,
    loadTranslations: loadHierarchyTranslations,
  },
] as const;

describe('feature slices', () => {
  it('both feature entries exist and export their documented names', () => {
    expect(AuthPlaceholderPage).toBeDefined();
    expect(HierarchyPlaceholderPage).toBeDefined();
  });

  it.each(PLACEHOLDERS)(
    'each placeholder exposes one h1 inside a main landmark and passes axe',
    async ({ Component, loadTranslations }) => {
      const runtime = await buildTestRuntime();
      await loadTranslations(runtime.i18n);
      const router = createMemoryRouter([
        {
          path: '/',
          element: <ApplicationLayout />,
          children: [{ index: true, element: <Component /> }],
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
    },
  );
});
