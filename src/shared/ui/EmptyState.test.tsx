import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders a title and message', () => {
    render(
      <EmptyState title="Nothing here yet" message="Add your first item" />,
    );

    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
    expect(screen.getByText('Add your first item')).toBeInTheDocument();
  });

  it('renders an optional action', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(
      <EmptyState
        title="Nothing here yet"
        message="Add your first item"
        action={{ label: 'Add item', onActivate }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Add item' }));

    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('renders no button when no action is given', () => {
    render(
      <EmptyState title="Nothing here yet" message="Add your first item" />,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a glyph and can render unframed', () => {
    const { container, rerender } = render(
      <EmptyState
        title="Nothing here yet"
        message="Add your first item"
        glyph={<span data-testid="glyph">○</span>}
      />,
    );

    expect(screen.getByTestId('glyph')).toBeInTheDocument();

    rerender(
      <EmptyState
        title="Nothing here yet"
        message="Add your first item"
        framed={false}
      />,
    );

    expect(container.firstElementChild?.className).not.toMatch(
      /rounded-card|border-border-hairline/,
    );
  });

  it('keeps hierarchy empty-state typography out of the framed kit presentation', () => {
    const { rerender } = render(
      <EmptyState
        title="Nothing here yet"
        message="Add your first item"
        action={{ label: 'Add item', onActivate: () => {} }}
      />,
    );

    expect(screen.getByRole('heading')).not.toHaveClass('text-[17px]');
    expect(screen.getByRole('button')).not.toHaveClass('h-[38px]');

    rerender(
      <EmptyState
        title="Nothing here yet"
        message="Add your first item"
        action={{ label: 'Add item', onActivate: () => {} }}
        framed={false}
      />,
    );

    expect(screen.getByRole('heading')).toHaveClass('text-[17px]');
    expect(screen.getByRole('button')).toHaveClass('h-[38px]');
  });
});
