import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRoute } from '../testing/renderRoute';
import { ErrorSurface } from './ErrorSurface';

describe('ErrorSurface', () => {
  it('renders the catalogue copy and the correlation id, and calls no router hook', async () => {
    await renderRoute(
      <ErrorSurface correlationId="abc123" onRecover={vi.fn()} />,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(
      screen.getByText('An unexpected error occurred.'),
    ).toBeInTheDocument();
    expect(screen.getByText('abc123')).toBeInTheDocument();
  });

  it('activates the recovery action when the retry button is pressed', async () => {
    const onRecover = vi.fn();
    await renderRoute(
      <ErrorSurface correlationId="abc123" onRecover={onRecover} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onRecover).toHaveBeenCalledOnce();
  });
});
