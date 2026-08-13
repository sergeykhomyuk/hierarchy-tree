import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renders its children', () => {
    render(
      <Card>
        <p>Card content</p>
      </Card>,
    );

    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders with compact padding', () => {
    render(
      <Card padding="compact">
        <p>Compact content</p>
      </Card>,
    );

    expect(screen.getByText('Compact content')).toBeInTheDocument();
  });
});
