import { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';
// eslint-disable-next-line testing-library/no-manual-cleanup -- the failure-kind sweep below renders several HierarchyPage instances in one test and needs each isolated from the last.
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import {
  createInternationalization,
  Locale,
} from '@platform/internationalization';
import { loadTranslations } from './loadTranslations';
import { HierarchyPage } from './HierarchyPage';
import { HierarchySkeleton } from './HierarchySkeleton';
import { HierarchyResultKind } from './data/fetchPeople';
import type { HierarchyFailureKind, HierarchyResult } from './data/fetchPeople';

const EMPTY_ANOMALIES = {
  duplicateId: 0,
  danglingManager: 0,
  selfManaged: 0,
  cycleBroken: 0,
  skippedExpansionSegment: 0,
};

function LocationSearchProbe() {
  const location = useLocation();
  return <span data-testid="location-search">{location.search}</span>;
}

type RenderIsolatedOptions = {
  onRetry?: () => void;
  initialEntries?: string[];
};

// use() suspends synchronously on the very first render, which regular
// render() + findBy polling does not reliably observe under React 19 - the
// initial suspend has to settle inside the SAME act() scope that triggers
// it (SignedInName.test.tsx's own precedent). Wrapped in a MemoryRouter
// with a /login route standing in for the real one, since the error
// state's "Back to login" action navigates through useNavigate().
async function renderIsolated(
  hierarchy: Promise<HierarchyResult>,
  options: RenderIsolatedOptions = {},
) {
  const onRetry = options.onRetry ?? vi.fn();
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
        <MemoryRouter initialEntries={options.initialEntries ?? ['/']}>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <LocationSearchProbe />
                  <Suspense fallback={<HierarchySkeleton />}>
                    <HierarchyPage hierarchy={hierarchy} onRetry={onRetry} />
                  </Suspense>
                </>
              }
            />
            <Route path="/login" element={<p>login-route</p>} />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>,
    );
  });
}

function failureResult(failure: HierarchyFailureKind): HierarchyResult {
  return {
    kind: HierarchyResultKind.Failure,
    failure,
    correlationId: 'a'.repeat(32),
  };
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

  it('every failure kind renders the error state inside the card with the header and nav rail unchanged', async () => {
    const failureKinds: readonly HierarchyFailureKind[] = [
      'network',
      'timeout',
      'http',
      'parse',
      'allRowsInvalid',
    ];

    for (const failure of failureKinds) {
      await renderIsolated(Promise.resolve(failureResult(failure)));

      // HierarchyPage renders only its own body - no banner or navigation
      // landmark of its own, since the header and nav rail are the
      // surrounding layout's, unaffected by which of the page's own four
      // states is showing (invariant 62).
      expect(screen.getAllByRole('alert')).toHaveLength(1);
      expect(screen.queryByRole('banner')).not.toBeInTheDocument();
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
      expect(screen.getByText('page.errorHeading')).toBeInTheDocument();
      expect(screen.getByText('page.errorBody')).toBeInTheDocument();

      cleanup();
    }
  });

  it('the chip carries the correlation id of the failed request', async () => {
    await renderIsolated(Promise.resolve(failureResult('network')));

    expect(screen.getByText('a'.repeat(32))).toBeInTheDocument();
  });

  it('Back to login navigates without signing the user out', async () => {
    const user = userEvent.setup();
    await renderIsolated(Promise.resolve(failureResult('network')));

    expect(screen.queryByText('login-route')).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'page.backToLoginLabel' }),
    );

    // Navigation alone, and only navigation - nothing here calls a
    // sign-out or session-clearing dependency, so there is nothing to
    // stub or assert beyond arriving at /login with the session untouched
    // (invariant 73).
    expect(screen.getByText('login-route')).toBeInTheDocument();
  });

  it('the error state never reaches the route error boundary', async () => {
    // No error boundary wraps this render tree - a render that threw
    // instead of returning the ErrorState branch would fail this test by
    // throwing out of render(), not by producing different markup.
    await renderIsolated(Promise.resolve(failureResult('network')));

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('failing to load leaves the expanded parameter untouched', async () => {
    await renderIsolated(Promise.resolve(failureResult('network')), {
      initialEntries: ['/?expanded=1,2,3'],
    });

    expect(screen.getByTestId('location-search')).toHaveTextContent(
      '?expanded=1,2,3',
    );
  });
});
