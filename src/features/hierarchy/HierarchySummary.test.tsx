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
  it('renders the title and the summary line', async () => {
    await renderSummary({ people: 10, managers: 4, roots: 2 });

    expect(
      screen.getByRole('heading', { level: 1, name: 'page.cardTitle' }),
    ).toBeInTheDocument();
    expect(screen.getByText('page.summary')).toBeInTheDocument();
  });

  it('the summary line composes from one catalogue string with placeholders', async () => {
    const i18n = await createInternationalization({
      resources: { common: {} },
      language: Locale.English,
      observability: { logger: { error: vi.fn() } },
    });
    await loadTranslations(i18n);

    render(
      <I18nextProvider i18n={i18n}>
        <HierarchySummary counts={{ people: 1234, managers: 4, roots: 2 }} />
      </I18nextProvider>,
    );

    // ONE catalogue string carrying all three placeholders, not three
    // fragments joined by a separator in code (invariant 157) - and 1234
    // people renders as "1,234", proving the number itself came through
    // Intl formatting rather than raw interpolation (invariant 156).
    expect(
      screen.getByText('1,234 people · 4 managers · 2 roots'),
    ).toBeInTheDocument();
  });
});
