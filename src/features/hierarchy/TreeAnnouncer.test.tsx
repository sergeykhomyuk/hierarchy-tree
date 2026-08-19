import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TreeAnnouncer } from './TreeAnnouncer';

describe('TreeAnnouncer', () => {
  it('is a polite, atomic live region carrying the message', () => {
    render(<TreeAnnouncer message="3 branches opened" />);

    const region = screen.getByTestId('tree-announcer');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveAttribute('aria-atomic', 'true');
    expect(region).toHaveTextContent('3 branches opened');
  });

  it('stays mounted with an empty message before any toggle happens, rather than being absent', () => {
    render(<TreeAnnouncer message="" />);

    expect(screen.getByTestId('tree-announcer')).toBeInTheDocument();
    expect(screen.getByTestId('tree-announcer')).toHaveTextContent('');
  });

  it('is visually hidden rather than shown on screen', () => {
    render(<TreeAnnouncer message="hello" />);

    expect(screen.getByTestId('tree-announcer')).toHaveClass('sr-only');
  });
});
