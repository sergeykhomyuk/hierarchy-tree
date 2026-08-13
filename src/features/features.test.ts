import { describe, expect, it } from 'vitest';

describe('feature slices', () => {
  it('both feature entries exist and export their documented names', async () => {
    const authEntry = await import('@features/auth');
    const hierarchyEntry = await import('@features/hierarchy');

    expect(authEntry.AuthPlaceholderPage).toBeDefined();
    expect(hierarchyEntry.HierarchyPlaceholderPage).toBeDefined();
  });
});
