import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('is hidden from assistive technology', () => {
    const { container } = render(
      <Skeleton shape="text" width="line" height="line" />,
    );

    // eslint-disable-next-line testing-library/no-node-access -- an aria-hidden placeholder has no accessible role to query by.
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders the circle shape for an avatar placeholder', () => {
    const { container } = render(
      <Skeleton shape="circle" width="avatar" height="avatar" />,
    );

    expect(container.firstElementChild?.className).toContain('rounded-full');
  });

  it('renders the block shape for a card placeholder', () => {
    const { container } = render(
      <Skeleton shape="block" width="card" height="card" />,
    );

    expect(container.firstElementChild?.className).toContain('rounded-card');
  });

  it('the skeleton emits no style attribute', () => {
    const { container } = render(
      <Skeleton shape="text" width="line" height="line" />,
    );

    // eslint-disable-next-line testing-library/no-node-access -- asserting absence of an attribute the production CSP blocks, not a role or text query.
    expect(container.firstElementChild).not.toHaveAttribute('style');
  });
});
