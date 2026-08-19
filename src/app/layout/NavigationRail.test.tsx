import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { NavigationRail } from './NavigationRail';

describe('NavigationRail', () => {
  it('the nav rail holds no focusable element and is hidden from assistive technology', () => {
    const { container } = render(<NavigationRail />);

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- the rail is entirely decorative (invariant 92), so there is no role or accessible name to query through.
    const focusable = container.querySelector(
      'a, button, input, select, textarea, [tabindex]',
    );
    expect(focusable).toBeNull();
    // eslint-disable-next-line testing-library/no-node-access -- same reason as above.
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
