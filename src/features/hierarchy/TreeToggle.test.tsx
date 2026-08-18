import { describe, expect, it, vi } from 'vitest';
import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TreeToggle } from './TreeToggle';

describe('TreeToggle', () => {
  it('shows a plus glyph collapsed and a minus glyph expanded', () => {
    const { rerender } = render(
      <TreeToggle isExpanded={false} onToggle={vi.fn()} />,
    );
    expect(screen.getByRole('button', { hidden: true })).toHaveTextContent('+');

    rerender(<TreeToggle isExpanded={true} onToggle={vi.fn()} />);
    expect(screen.getByRole('button', { hidden: true })).toHaveTextContent('−');
  });

  it('is out of the tab sequence and hidden from assistive technology', () => {
    render(<TreeToggle isExpanded={false} onToggle={vi.fn()} />);

    const button = screen.getByRole('button', { hidden: true });
    expect(button).toHaveAttribute('tabindex', '-1');
    expect(button).toHaveAttribute('aria-hidden', 'true');
  });

  it('calls onToggle on click', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<TreeToggle isExpanded={false} onToggle={onToggle} />);

    await user.click(screen.getByRole('button', { hidden: true }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('prevents a mousedown from ever making it a focus candidate', () => {
    render(<TreeToggle isExpanded={false} onToggle={vi.fn()} />);
    const button = screen.getByRole('button', { hidden: true });

    const event = createEvent.mouseDown(button);
    const notCancelled = fireEvent(button, event);

    expect(notCancelled).toBe(false);
  });
});
