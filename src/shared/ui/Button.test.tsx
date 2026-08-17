import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders its children as the accessible name', () => {
    render(
      <Button variant="primary" onClick={vi.fn()}>
        Save
      </Button>,
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('calls onClick when activated and not busy', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <Button variant="primary" onClick={handleClick}>
        Save
      </Button>,
    );

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('a busy button cannot submit its form by pointer or keyboard', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn((event: { preventDefault: () => void }) => {
      event.preventDefault();
    });
    const handleClick = vi.fn();

    render(
      <form onSubmit={handleSubmit}>
        <Button variant="primary" type="submit" busy onClick={handleClick}>
          Submit
        </Button>
      </form>,
    );

    const button = screen.getByRole('button', { name: 'Submit' });

    await user.click(button);
    expect(handleSubmit).not.toHaveBeenCalled();
    expect(handleClick).not.toHaveBeenCalled();

    button.focus();
    await user.keyboard('{Enter}');
    expect(handleSubmit).not.toHaveBeenCalled();
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('keeps the visible label as the accessible name while busy', () => {
    render(
      <Button variant="primary" busy onClick={vi.fn()}>
        Save
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  it('stays focusable while busy, unlike the native disabled attribute', () => {
    render(
      <Button variant="primary" busy onClick={vi.fn()}>
        Save
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).not.toBeDisabled();
    button.focus();
    expect(button).toHaveFocus();
  });

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <Button variant="primary" disabled onClick={handleClick}>
        Save
      </Button>,
    );

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders a spinner and the pressed fill while busy', () => {
    render(
      <Button variant="primary" busy onClick={vi.fn()}>
        Save
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Save' });
    // eslint-disable-next-line testing-library/no-node-access -- the decorative spinner is aria-hidden and has no accessible role to query by.
    expect(button.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(button.className).toContain('bg-primary-pressed');
    expect(button.className).not.toContain('hover:bg-primary-pressed');
  });

  it('forwards a ref to the underlying button element', () => {
    let element: HTMLButtonElement | null = null;
    render(
      <Button
        variant="primary"
        onClick={vi.fn()}
        ref={(node) => {
          element = node;
        }}
      >
        Save
      </Button>,
    );

    expect(element).toBe(screen.getByRole('button', { name: 'Save' }));
  });

  it('renders the secondary variant', () => {
    render(
      <Button variant="secondary" onClick={vi.fn()}>
        Cancel
      </Button>,
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('renders at full width when fullWidth is set', () => {
    render(
      <Button variant="primary" fullWidth onClick={vi.fn()}>
        Save
      </Button>,
    );

    expect(screen.getByRole('button', { name: 'Save' })).toHaveClass(
      'w-full',
    );
  });

  it('does not stretch to full width by default', () => {
    render(
      <Button variant="primary" onClick={vi.fn()}>
        Save
      </Button>,
    );

    expect(screen.getByRole('button', { name: 'Save' })).not.toHaveClass(
      'w-full',
    );
  });
});
