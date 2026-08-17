import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { renderRoute } from '../testing/renderRoute';
import { ApplicationLayout } from './ApplicationLayout';

function renderLayout(): ReturnType<typeof renderRoute> {
  const router = createMemoryRouter([
    {
      path: '/',
      element: <ApplicationLayout />,
      children: [{ index: true, element: <h1>Probe page</h1> }],
    },
  ]);

  return renderRoute(<RouterProvider router={router} />);
}

describe('ApplicationLayout', () => {
  it('renders the matched child route inside a main landmark', async () => {
    await renderLayout();

    const main = screen.getByRole('main');
    expect(main).toContainElement(
      screen.getByRole('heading', { name: 'Probe page' }),
    );
  });

  it('renders a skip link pointing at the main landmark', async () => {
    await renderLayout();

    const skipLink = screen.getByRole('link', { name: 'layout.skipLink' });
    const main = screen.getByRole('main');

    expect(skipLink).toHaveAttribute('href', `#${main.id}`);
  });

  it('visually hides the skip link until it is focused', async () => {
    await renderLayout();

    const skipLink = screen.getByRole('link', { name: 'layout.skipLink' });

    expect(skipLink).toHaveClass('sr-only', 'focus:not-sr-only');
  });
});
