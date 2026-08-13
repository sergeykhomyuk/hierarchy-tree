import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('feature slices', () => {
  it('both feature entries exist and export their documented names', async () => {
    const authEntry = await import('@features/auth');
    const hierarchyEntry = await import('@features/hierarchy');

    expect(authEntry.AuthPlaceholderPage).toBeDefined();
    expect(hierarchyEntry.HierarchyPlaceholderPage).toBeDefined();

    // No product behavior yet (invariant 9) - rendering without throwing is
    // what M1's own coverage claim rests on until M5 replaces the body.
    expect(() => render(<authEntry.AuthPlaceholderPage />)).not.toThrow();
    expect(() =>
      render(<hierarchyEntry.HierarchyPlaceholderPage />),
    ).not.toThrow();
  });
});
