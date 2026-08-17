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

  it('uses the generic card radius by default', () => {
    const { container } = render(
      <Card>
        <p>Card content</p>
      </Card>,
    );

    // eslint-disable-next-line testing-library/no-node-access -- there is no RTL query for "this component's own root element and its classes".
    expect(container.firstElementChild).toHaveClass('rounded-card');
    // eslint-disable-next-line testing-library/no-node-access -- see above.
    expect(container.firstElementChild).not.toHaveClass('rounded-login-card');
  });

  it('uses the login card radius when radius is set to login', () => {
    const { container } = render(
      <Card radius="login">
        <p>Card content</p>
      </Card>,
    );

    // eslint-disable-next-line testing-library/no-node-access -- there is no RTL query for "this component's own root element and its classes".
    expect(container.firstElementChild).toHaveClass('rounded-login-card');
    // eslint-disable-next-line testing-library/no-node-access -- see above.
    expect(container.firstElementChild).not.toHaveClass('rounded-card');
  });
});
