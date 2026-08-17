import { describe, expect, it, vi } from 'vitest';
import {
  act,
  // eslint-disable-next-line testing-library/no-manual-cleanup -- the automatic afterEach cleanup runs only between it() blocks; the second test renders twice in a row and needs each render isolated from the last.
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import {
  createInternationalization,
  createKeyEchoCatalogue,
  Locale,
} from '@platform/internationalization';
import { readSession } from '@features/auth';
import type { SignedInUserView } from '@features/auth';
import type { KeyValueStorage } from '@platform/runtime';
import type { ObservabilityFacade } from '@platform/observability';
import commonCatalogue from '../locales/en/common.json';
import { SignedInHeader } from './SignedInHeader';
import type { SignedInHeaderDependencies } from './SignedInHeader';

// The real session storage key and shape (features/auth/session/*), not
// reachable from app/ through the feature barrel - mirrors
// bootstrap.test.tsx's own precedent for seeding a session from outside
// the feature.
const SESSION_STORAGE_KEY = 'hierarchy-tree.session';

function createSpyObservability(): ObservabilityFacade {
  return {
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    tracer: {
      recordTiming: vi.fn(),
      startInteraction: vi.fn(() => 'a'.repeat(32)),
    },
    analytics: { track: vi.fn() },
  };
}

function createMapStorage(seed?: Record<string, string>): KeyValueStorage {
  const map = new Map<string, string>(Object.entries(seed ?? {}));
  return {
    read: (key) => map.get(key) ?? null,
    write: (key, value) => {
      map.set(key, value);
      return true;
    },
    remove: (key) => {
      map.delete(key);
    },
  };
}

function createTestDependencies(
  overrides: Partial<SignedInHeaderDependencies> = {},
): SignedInHeaderDependencies {
  return {
    observability: overrides.observability ?? createSpyObservability(),
    tabStorage: overrides.tabStorage ?? createMapStorage(),
    beginInteraction: overrides.beginInteraction ?? vi.fn(() => 'a'.repeat(32)),
    navigate: overrides.navigate ?? vi.fn(),
  };
}

function pendingForever(): Promise<SignedInUserView | null> {
  return new Promise(() => {});
}

// Same act()-wraps-the-render requirement as SignedInName.test.tsx: the
// header composes SignedInName, which suspends synchronously on its
// first render via use().
async function renderHeader(
  signedInUser: Promise<SignedInUserView | null>,
  dependencies: SignedInHeaderDependencies,
): Promise<void> {
  const i18n = await createInternationalization({
    resources: { common: createKeyEchoCatalogue(commonCatalogue) },
    language: Locale.Test,
    observability: { logger: { error: vi.fn() } },
  });
  // eslint-disable-next-line testing-library/no-unnecessary-act, @typescript-eslint/require-await -- act() must wrap the initial render itself for a component that suspends synchronously on mount; see SignedInName.test.tsx's renderIsolated for the full rationale.
  await act(async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <SignedInHeader
          signedInUser={signedInUser}
          dependencies={dependencies}
        />
      </I18nextProvider>,
    );
  });
}

describe('SignedInHeader', () => {
  it('renders the eyebrow, the title, the name and the logout control', async () => {
    await renderHeader(
      Promise.resolve({ displayName: 'Ada Lovelace' }),
      createTestDependencies(),
    );

    expect(screen.getByText('header.eyebrow')).toBeInTheDocument();
    expect(screen.getByText('header.pageTitle')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'header.logout' }),
    ).toBeInTheDocument();
  });

  it('keeps logout operable before a name is known and when one never arrives', async () => {
    await renderHeader(pendingForever(), createTestDependencies());
    expect(screen.getByRole('button', { name: 'header.logout' })).toBeEnabled();
    cleanup();

    await renderHeader(Promise.resolve(null), createTestDependencies());
    expect(screen.getByRole('button', { name: 'header.logout' })).toBeEnabled();
  });

  it('clears the session and returns to the login route', async () => {
    const observability = createSpyObservability();
    const navigate = vi.fn();
    const tabStorage = createMapStorage({
      [SESSION_STORAGE_KEY]: JSON.stringify({
        version: 1,
        userId: 'user-1',
      }),
    });
    const dependencies = createTestDependencies({
      observability,
      navigate,
      tabStorage,
    });

    await renderHeader(
      Promise.resolve({ displayName: 'Ada Lovelace' }),
      dependencies,
    );

    fireEvent.click(screen.getByRole('button', { name: 'header.logout' }));

    expect(readSession(tabStorage, observability)).toEqual({
      status: 'signedOut',
    });
    expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
    expect(observability.analytics.track).toHaveBeenCalledWith(
      'auth.signed_out',
      { correlationId: 'a'.repeat(32) },
    );
  });
});
