import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import {
  createInternationalization,
  Locale,
} from '@platform/internationalization';
import { loadTranslations } from './loadTranslations';
import { HierarchyTree } from './HierarchyTree';
import type { HierarchyTreeProps } from './HierarchyTree';
import { buildForest } from './domain/buildForest';
import { parsePersonIdentifier } from './domain/personIdentifier';
import { testPerson } from './testing/testPerson';

async function renderTree(props: HierarchyTreeProps) {
  const i18n = await createInternationalization({
    resources: { common: {} },
    language: Locale.Test,
    observability: { logger: { error: vi.fn() } },
  });
  await loadTranslations(i18n);
  return render(
    <I18nextProvider i18n={i18n}>
      <HierarchyTree {...props} />
    </I18nextProvider>,
  );
}

describe('HierarchyTree', () => {
  it('renders every visible row from the row model, in order, and nothing else', async () => {
    const { roots } = buildForest([
      testPerson(1),
      testPerson(2, { managerId: 1 }),
    ]);

    await renderTree({
      roots,
      expandedIds: new Set([parsePersonIdentifier(1)]),
    });

    const rows = screen.getAllByRole('treeitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAccessibleName('First1 Last1');
    expect(rows[1]).toHaveAccessibleName('First2 Last2');
  });

  it('a string signed-in identifier marks no row and changes nothing else', async () => {
    const { roots } = buildForest([testPerson(1)]);

    await renderTree({
      roots,
      expandedIds: new Set(),
      signedInUserId: 'not-a-person-id',
    });

    const rows = screen.getAllByRole('treeitem');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveAccessibleName('First1 Last1');
  });
});
