import { describe, expect, it, vi } from 'vitest';
// eslint-disable-next-line testing-library/no-manual-cleanup -- the manager/non-manager report-count test renders two rows in one test and needs each isolated from the last.
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import {
  createInternationalization,
  Locale,
} from '@platform/internationalization';
import { loadTranslations } from './loadTranslations';
import { TreeRow } from './TreeRow';
import type { TreeRowProps } from './TreeRow';
import { parseEmailAddress } from './domain/emailAddress';
import { parsePersonIdentifier } from './domain/personIdentifier';
import * as personDisplayNameModule from './domain/personDisplayName';

async function createTestI18n() {
  const i18n = await createInternationalization({
    resources: { common: {} },
    language: Locale.Test,
    observability: { logger: { error: vi.fn() } },
  });
  await loadTranslations(i18n);
  return i18n;
}

async function renderRow(props: TreeRowProps) {
  const i18n = await createTestI18n();
  return render(
    <I18nextProvider i18n={i18n}>
      <TreeRow {...props} />
    </I18nextProvider>,
  );
}

const MANAGER_PROPS: TreeRowProps = {
  personId: parsePersonIdentifier(1),
  firstName: 'Ronnen',
  lastName: 'Gurevitch',
  email: parseEmailAddress('ronnen@example.test'),
  depth: 0,
  isExpanded: true,
  hasChildren: true,
  reportCount: 3,
  setSize: 2,
  posInSet: 1,
  isSignedInUser: false,
  onPhotoError: vi.fn(),
};

describe('TreeRow', () => {
  it('the row accessible name is the person name plus the you marker and not the email, the count or the toggle glyph', async () => {
    await renderRow({
      ...MANAGER_PROPS,
      email: parseEmailAddress('ronnen@example.test'),
      isSignedInUser: true,
    });

    const row = screen.getByRole('treeitem');
    expect(row).toHaveAccessibleName('Ronnen Gurevitch, page.youMarkerLabel');
    expect(row.getAttribute('aria-label')).not.toContain('ronnen@example.test');
    expect(row.getAttribute('aria-label')).not.toContain('3');
    expect(row.getAttribute('aria-label')).not.toContain('+');
  });

  it('the photo is decorative in the accessibility tree', async () => {
    const { container } = await renderRow({
      ...MANAGER_PROPS,
      photo: 'https://example.test/ronnen.jpg',
    });

    // A decorative <img alt=""> is removed from the accessibility tree -
    // getByRole('img') would not find it, so the accessible-tree claim is
    // proven by its absence there, and the DOM element itself is checked
    // directly for the empty alt that removes it (invariant 101).
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- confirming the decorative alt="" directly, since a decorative image is deliberately absent from getByRole('img').
    const image = container.querySelector('img');
    expect(image).toHaveAttribute('alt', '');
  });

  it('a manager row shows its direct report count and a non-manager row shows none', async () => {
    await renderRow(MANAGER_PROPS);
    expect(screen.getByText(/3 page\.reportsLabel/)).toBeInTheDocument();

    cleanup();

    await renderRow({
      ...MANAGER_PROPS,
      hasChildren: false,
      isExpanded: false,
      reportCount: 0,
    });
    expect(screen.queryByText(/page\.reportsLabel/)).not.toBeInTheDocument();
    expect(screen.queryByText(/page\.hiddenLabel/)).not.toBeInTheDocument();
  });

  it('the hidden wording counts direct reports so the number never changes with expansion', async () => {
    await renderRow({ ...MANAGER_PROPS, isExpanded: false });

    expect(screen.getByText(/3 page\.hiddenLabel/)).toBeInTheDocument();
    expect(screen.queryByText(/page\.reportsLabel/)).not.toBeInTheDocument();
  });

  it('toggling a branch under one root leaves the render count of a row under another root unchanged', async () => {
    const i18n = await createTestI18n();
    // personDisplayName runs unconditionally in TreeRow's own render body,
    // so its call count is a direct proxy for how many times the row
    // actually re-rendered - a Profiler wrapping a bailed-out memo child
    // still fires onRender for that commit, which makes it unreliable for
    // this exact claim; this spy is not.
    const displayNameSpy = vi.spyOn(
      personDisplayNameModule,
      'personDisplayName',
    );

    function Harness({ root1Expanded }: { root1Expanded: boolean }) {
      return (
        <I18nextProvider i18n={i18n}>
          <TreeRow
            {...MANAGER_PROPS}
            firstName="Under"
            lastName="RootOne"
            isExpanded={root1Expanded}
          />
          <TreeRow
            {...MANAGER_PROPS}
            firstName="Under"
            lastName="RootTwo"
            posInSet={2}
          />
        </I18nextProvider>
      );
    }

    const { rerender } = render(<Harness root1Expanded={false} />);
    expect(displayNameSpy).toHaveBeenCalledTimes(2);

    // Simulates the one branch under root 1 toggling - root 2's own row
    // gets no new props at all, so its memo comparison bails out and it
    // never re-renders. If it did, the count below would be 4, not 3
    // (invariant 91).
    rerender(<Harness root1Expanded={true} />);
    expect(displayNameSpy).toHaveBeenCalledTimes(3);
  });
});
