import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { renderRoute } from '../../testing/renderRoute';
import { NotFoundRoute } from './NotFoundRoute';

describe('NotFoundRoute', () => {
  it('an unmatched path renders the not-found route with a link home', async () => {
    await renderRoute(
      <MemoryRouter>
        <NotFoundRoute />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'Back to home' });
    expect(link).toHaveAttribute('href', '/');
  });
});
