import { describe, expect, it, vi } from 'vitest';
// eslint-disable-next-line testing-library/no-manual-cleanup -- the automatic afterEach cleanup runs only between it() blocks; this test renders three times in a row and needs each render isolated from the last.
import { act, cleanup, render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import {
  createInternationalization,
  createKeyEchoCatalogue,
  Locale,
} from '@platform/internationalization';
import type { SignedInUserView } from '@features/auth';
import commonCatalogue from '../locales/en/common.json';
import { SignedInName } from './SignedInName';

// use() suspends synchronously on the very first render, which regular
// render() + findBy polling does not reliably observe under React 19 -
// the initial suspend has to settle inside the SAME act() scope that
// triggers it, not a later one, or React warns "suspended inside an act
// scope, but the act call was not awaited" and the DOM never updates.
async function renderIsolated(
  signedInUser: Promise<SignedInUserView | null>,
): Promise<RenderResult> {
  const i18n = await createInternationalization({
    resources: { common: createKeyEchoCatalogue(commonCatalogue) },
    language: Locale.Test,
    observability: { logger: { error: vi.fn() } },
  });
  let result: RenderResult | undefined;
  // eslint-disable-next-line testing-library/no-unnecessary-act, @typescript-eslint/require-await -- act() must wrap the initial render itself for a component that suspends synchronously on mount; awaiting render() alone (or wrapping only afterward) leaves the suspend outside any act scope, per the React 19 warning this was written against.
  await act(async () => {
    result = render(
      <I18nextProvider i18n={i18n}>
        <SignedInName signedInUser={signedInUser} />
      </I18nextProvider>,
    );
  });
  if (result === undefined) {
    throw new Error('render() did not run inside the act() callback');
  }
  return result;
}

function pendingForever(): Promise<SignedInUserView | null> {
  return new Promise(() => {});
}

describe('SignedInName', () => {
  it('renders the skeleton while the name is resolving', async () => {
    await renderIsolated(pendingForever());

    const busy = screen.getByLabelText('header.nameLoading');
    expect(busy).toHaveAttribute('aria-busy', 'true');
  });

  it('renders the full name and its initials once resolved', async () => {
    await renderIsolated(Promise.resolve({ displayName: 'Ada Lovelace' }));

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('AL')).toBeInTheDocument();
  });

  it('renders a static placeholder, not the pulsing skeleton, when the name never resolves', async () => {
    await renderIsolated(Promise.resolve(null));

    const fallback = screen.getByText('header.signedInFallback');
    expect(fallback).toBeInTheDocument();
    expect(screen.queryByLabelText('header.nameLoading')).toBeNull();

    // eslint-disable-next-line testing-library/no-node-access -- an aria-hidden avatar placeholder has no accessible role to query by (Skeleton.test.tsx's own precedent for the same shape).
    const avatarPlaceholder = fallback.parentElement?.querySelector(
      '[aria-hidden="true"]',
    );
    expect(avatarPlaceholder).not.toBeNull();
    expect(avatarPlaceholder?.className).not.toContain('animate-pulse');
  });

  it('reserves the same box in all three presentations', async () => {
    // Every avatar-position element shares sizeClass.avatar's box
    // (h-[34px] w-[34px]) regardless of which presentation is showing -
    // the property that keeps resolution from reflowing the header.
    const AVATAR_BOX_CLASSES = ['h-[34px]', 'w-[34px]'];

    const { container: pendingContainer } =
      await renderIsolated(pendingForever());
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- an aria-hidden skeleton placeholder has no accessible role to query by.
    const pendingAvatar = pendingContainer.querySelector(
      '[aria-busy="true"] span',
    );
    for (const className of AVATAR_BOX_CLASSES) {
      expect(pendingAvatar?.className).toContain(className);
    }
    cleanup();

    await renderIsolated(Promise.resolve({ displayName: 'Ada Lovelace' }));
    const resolvedAvatar = screen.getByText('AL');
    for (const className of AVATAR_BOX_CLASSES) {
      expect(resolvedAvatar.className).toContain(className);
    }
    cleanup();

    const { container: fallbackContainer } = await renderIsolated(
      Promise.resolve(null),
    );
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- an aria-hidden avatar placeholder has no accessible role to query by.
    const fallbackAvatar = fallbackContainer.querySelector(
      '[aria-hidden="true"]',
    );
    for (const className of AVATAR_BOX_CLASSES) {
      expect(fallbackAvatar?.className).toContain(className);
    }
  });
});
