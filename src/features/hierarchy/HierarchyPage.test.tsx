import { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import {
  createInternationalization,
  Locale,
} from '@platform/internationalization';
import { loadTranslations } from './loadTranslations';
import { HierarchyPage } from './HierarchyPage';
import { HierarchySkeleton } from './HierarchySkeleton';
import { HierarchyResultKind } from './data/fetchPeople';
import type { HierarchyResult } from './data/fetchPeople';

const EMPTY_ANOMALIES = {
  duplicateId: 0,
  danglingManager: 0,
  selfManaged: 0,
  cycleBroken: 0,
  skippedExpansionSegment: 0,
};

// use() suspends synchronously on the very first render, which regular
// render() + findBy polling does not reliably observe under React 19 - the
// initial suspend has to settle inside the SAME act() scope that triggers
// it (SignedInName.test.tsx's own precedent).
async function renderIsolated(hierarchy: Promise<HierarchyResult>) {
  const i18n = await createInternationalization({
    resources: { common: {} },
    language: Locale.Test,
    observability: { logger: { error: vi.fn() } },
  });
  await loadTranslations(i18n);
  // eslint-disable-next-line testing-library/no-unnecessary-act, @typescript-eslint/require-await -- act() must wrap the initial render itself for a component that suspends synchronously on mount.
  await act(async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <Suspense fallback={<HierarchySkeleton />}>
          <HierarchyPage hierarchy={hierarchy} />
        </Suspense>
      </I18nextProvider>,
    );
  });
}

describe('HierarchyPage', () => {
  it('the loading state announces itself busy once and stops when data arrives', async () => {
    let resolveHierarchy: ((value: HierarchyResult) => void) | undefined;
    const hierarchy = new Promise<HierarchyResult>((resolve) => {
      resolveHierarchy = resolve;
    });

    await renderIsolated(hierarchy);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');

    await act(async () => {
      resolveHierarchy?.({
        kind: HierarchyResultKind.Data,
        roots: [],
        anomalies: EMPTY_ANOMALIES,
        counts: { people: 0, managers: 0, roots: 0 },
        dropped: 0,
      });
      await hierarchy;
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('a response faster than the skeleton still renders the data state', async () => {
    const hierarchy = Promise.resolve<HierarchyResult>({
      kind: HierarchyResultKind.Data,
      roots: [],
      anomalies: EMPTY_ANOMALIES,
      counts: { people: 0, managers: 0, roots: 0 },
      dropped: 0,
    });

    await renderIsolated(hierarchy);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('page.cardTitle')).toBeInTheDocument();
  });

  it('never renders while cancelled', async () => {
    await renderIsolated(
      Promise.resolve({ kind: HierarchyResultKind.Cancelled }),
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText('page.cardTitle')).not.toBeInTheDocument();
  });
});
