import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { renderRoute } from '../testing/renderRoute';
import { RouteErrorBoundary } from './RouteErrorBoundary';

function Bomb(): never {
  throw new Error('boom');
}

describe('RouteErrorBoundary', () => {
  it('renders the error surface when a route throws while rendering', async () => {
    const router = createMemoryRouter([
      { path: '/', element: <Bomb />, ErrorBoundary: RouteErrorBoundary },
    ]);

    await renderRoute(<RouterProvider router={router} />);

    expect(screen.getByText('errorSurface.title')).toBeInTheDocument();
    // Keyboard recovery (invariant 93) and that the retry actually
    // re-runs the route rather than reloading are e2e-only checks
    // (TECH.md 5.4) - jsdom has no real navigation to observe, and
    // React's own error-retry behavior makes a unit-level render count
    // an unreliable way to prove it.
    expect(
      screen.getByRole('button', { name: 'errorSurface.retry' }),
    ).toBeInTheDocument();
  });
});
