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

  it('independent width and height sizes never emit two conflicting classes for the same dimension', () => {
    const { container } = render(
      <Skeleton shape="block" width="card" height="avatar" />,
    );

    // eslint-disable-next-line testing-library/no-node-access -- className composition is not queryable through role or text.
    const element = container.firstElementChild;
    const classNames = element?.className.split(' ') ?? [];
    const widthClasses = classNames.filter((name) => name.startsWith('w-'));
    const heightClasses = classNames.filter((name) => name.startsWith('h-'));

    expect(
      widthClasses,
      `expected exactly one width class, got ${widthClasses.join(', ')}`,
    ).toHaveLength(1);
    expect(
      heightClasses,
      `expected exactly one height class, got ${heightClasses.join(', ')}`,
    ).toHaveLength(1);
    expect(widthClasses).toEqual(['w-full']);
    expect(heightClasses).toEqual(['h-[34px]']);
  });
});
