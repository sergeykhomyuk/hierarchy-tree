import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import {
  createInternationalization,
  Locale,
} from '@platform/internationalization';
import { loadTranslations } from './loadTranslations';
import { HierarchySummary } from './HierarchySummary';

async function renderSummary(counts: {
  people: number;
  managers: number;
  roots: number;
}) {
  const i18n = await createInternationalization({
    resources: { common: {} },
    language: Locale.Test,
    observability: { logger: { error: vi.fn() } },
  });
  await loadTranslations(i18n);
  return render(
    <I18nextProvider i18n={i18n}>
      <HierarchySummary counts={counts} />
    </I18nextProvider>,
  );
}

describe('HierarchySummary', () => {
  it('renders the title and all three counts', async () => {
    await renderSummary({ people: 10, managers: 4, roots: 2 });

    expect(
      screen.getByRole('heading', { level: 1, name: 'page.cardTitle' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/10/)).toBeInTheDocument();
    expect(screen.getByText(/4/)).toBeInTheDocument();
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });
});
