import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import {
  createInternationalization,
  Locale,
} from '@platform/internationalization';
import { loadTranslations } from './loadTranslations';
import { HierarchySkeleton } from './HierarchySkeleton';

async function renderSkeleton() {
  const i18n = await createInternationalization({
    resources: { common: {} },
    language: Locale.Test,
    observability: { logger: { error: vi.fn() } },
  });
  await loadTranslations(i18n);
  return render(
    <I18nextProvider i18n={i18n}>
      <HierarchySkeleton />
    </I18nextProvider>,
  );
}

describe('HierarchySkeleton', () => {
  it('exposes no row, no tree role and no interactive element', async () => {
    await renderSkeleton();

    expect(screen.queryByRole('tree')).not.toBeInTheDocument();
    expect(screen.queryByRole('treeitem')).not.toBeInTheDocument();
    expect(screen.queryByRole('row')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('announces itself busy once via a single status region', async () => {
    await renderSkeleton();

    const statuses = screen.getAllByRole('status');
    expect(statuses).toHaveLength(1);
    expect(statuses[0]).toHaveAttribute('aria-busy', 'true');
    expect(statuses[0]).toHaveAccessibleName('page.loadingLabel');
  });
});
