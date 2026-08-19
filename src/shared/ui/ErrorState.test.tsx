import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('renders the title, message and an alert role', () => {
    render(
      <ErrorState title="Something went wrong" message="Try again later" />,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Try again later')).toBeInTheDocument();
  });

  it('renders an optional correlation id', () => {
    render(
      <ErrorState
        title="Something went wrong"
        message="Try again later"
        correlationId="abc123"
      />,
    );

    expect(screen.getByText('abc123')).toBeInTheDocument();
  });

  it('renders the recovery action as a real focusable button with an accessible name', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(
      <ErrorState
        title="Something went wrong"
        message="Try again later"
        action={{ label: 'Retry', onActivate }}
      />,
    );

    const button = screen.getByRole('button', { name: 'Retry' });
    await user.click(button);

    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('renders a second action and a glyph and can render unframed', () => {
    const { rerender } = render(
      <ErrorState
        title="Something went wrong"
        message="Try again later"
        glyph={<span data-testid="glyph">!</span>}
        action={{ label: 'Retry', onActivate: () => {} }}
        secondaryAction={{ label: 'Back to login', onActivate: () => {} }}
      />,
    );

    expect(screen.getByTestId('glyph')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Back to login' }),
    ).toBeInTheDocument();

    rerender(
      <ErrorState
        title="Something went wrong"
        message="Try again later"
        framed={false}
      />,
    );

    expect(screen.getByRole('alert').className).not.toMatch(
      /rounded-card|border-border-hairline/,
    );
  });

  it('keeps hierarchy error-state typography out of the framed kit presentation', () => {
    const { rerender } = render(
      <ErrorState
        title="Something went wrong"
        message="Try again later"
        correlationId="abc123"
        action={{ label: 'Retry', onActivate: () => {} }}
      />,
    );

    expect(screen.getByRole('heading')).not.toHaveClass('text-[17px]');
    expect(screen.getByText('abc123')).not.toHaveClass('bg-surface-hover');
    expect(screen.getByRole('button')).not.toHaveClass('h-[38px]');

    rerender(
      <ErrorState
        title="Something went wrong"
        message="Try again later"
        correlationId="abc123"
        action={{ label: 'Retry', onActivate: () => {} }}
        framed={false}
      />,
    );

    expect(screen.getByRole('heading')).toHaveClass('text-[17px]');
    expect(screen.getByText('abc123')).toHaveClass('bg-surface-hover');
    expect(screen.getByRole('button')).toHaveClass('h-[38px]');
  });
});
