import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import '@shared/testing/toHaveNoAxeViolations';
import { KIT_COMPONENT_NAMES, kitStates } from './kitStates';

describe('kitStates', () => {
  it('every exported kit component has a state in the inventory', () => {
    const coveredComponents = new Set(
      kitStates.map((entry) => entry.component),
    );

    for (const name of KIT_COMPONENT_NAMES) {
      expect(
        coveredComponents.has(name),
        `${name} has no state in the inventory`,
      ).toBe(true);
    }
  });

  it('every documented kit state has zero axe violations', async () => {
    expect(kitStates.length).toBeGreaterThan(0);

    for (const entry of kitStates) {
      const { container, unmount } = render(entry.render());

      await expect(
        container,
        `${entry.component} (${entry.state}) has an axe violation`,
      ).toHaveNoAxeViolations();

      unmount();
    }
  });
});
