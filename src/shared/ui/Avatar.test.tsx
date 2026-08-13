import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('renders an image with explicit width, height, lazy loading and no-referrer policy', () => {
    render(
      <Avatar
        imageSource="https://example.com/avatar.jpg"
        displayName="Ada Lovelace"
        size="medium"
        decorative={false}
      />,
    );

    const image = screen.getByRole('img', { name: 'Ada Lovelace' });
    expect(image).toHaveAttribute('width');
    expect(image).toHaveAttribute('height');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('referrerpolicy', 'no-referrer');
  });

  it('the avatar falls back to initials when the image fails to load', () => {
    render(
      <Avatar
        imageSource="https://example.com/broken.jpg"
        displayName="Ada Lovelace"
        size="medium"
        decorative={false}
      />,
    );

    const image = screen.getByRole('img', { name: 'Ada Lovelace' });
    fireEvent.error(image);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('AL')).toBeInTheDocument();
  });

  it('falls back to initials when no image source is given', () => {
    render(
      <Avatar displayName="Grace Hopper" size="medium" decorative={false} />,
    );

    expect(screen.getByText('GH')).toBeInTheDocument();
  });

  it('exposes an accessible name from displayName when not decorative', () => {
    render(
      <Avatar displayName="Grace Hopper" size="small" decorative={false} />,
    );

    expect(screen.getByLabelText('Grace Hopper')).toBeInTheDocument();
  });

  it('is hidden from assistive technology when decorative', () => {
    render(<Avatar displayName="Grace Hopper" size="small" decorative />);

    expect(screen.queryByLabelText('Grace Hopper')).not.toBeInTheDocument();
  });

  it('renders a decorative image with an empty alt instead of the display name', () => {
    const { container } = render(
      <Avatar
        imageSource="https://example.com/avatar.jpg"
        displayName="Grace Hopper"
        size="small"
        decorative
      />,
    );

    // An empty alt removes the img from the accessibility tree's img role,
    // so it is unreachable through getByRole - the decorative contract
    // itself is what is being asserted here.
    expect(screen.queryByRole('img')).not.toBeInTheDocument();

    // eslint-disable-next-line testing-library/no-node-access -- the element under test has no accessible role by design.
    const image = container.firstElementChild;
    expect(image).toHaveAttribute('alt', '');
  });
});
