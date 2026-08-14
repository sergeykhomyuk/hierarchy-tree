import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { kitStates } from '../testing';
import { KitRoute } from './KitRoute';

describe('KitRoute', () => {
  it('renders every documented kit state in its own labelled region', () => {
    render(<KitRoute />);

    for (const entry of kitStates) {
      const region = screen.getByRole('region', {
        name: `${entry.component} ${entry.state}`,
      });

      expect(region).toHaveAttribute(
        'data-kit-state',
        `${entry.component}-${entry.state}`,
      );
    }
  });

  it('has exactly one region per documented kit state', () => {
    render(<KitRoute />);

    expect(screen.getAllByRole('region')).toHaveLength(kitStates.length);
  });
});
