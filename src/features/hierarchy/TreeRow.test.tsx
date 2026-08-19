import { describe, expect, it, vi } from 'vitest';
// eslint-disable-next-line testing-library/no-manual-cleanup -- the manager/non-manager report-count test renders two rows in one test and needs each isolated from the last.
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import {
  createInternationalization,
  Locale,
} from '@platform/internationalization';
import { loadTranslations } from './loadTranslations';
import { TreeRow } from './TreeRow';
import type { TreeRowProps } from './TreeRow';
import { parseEmailAddress, parsePersonIdentifier } from './domain';
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
  photoResetToken: undefined,
  isTabbable: false,
  onPhotoError: vi.fn(),
  onToggle: vi.fn(),
  onRowFocus: vi.fn(),
  onKeyDown: vi.fn(),
  registerElement: vi.fn(),
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
    expect(screen.getByText(/3 page\.reports_other/)).toBeInTheDocument();

    cleanup();

    await renderRow({
      ...MANAGER_PROPS,
      hasChildren: false,
      isExpanded: false,
      reportCount: 0,
    });
    expect(screen.queryByText(/page\.reports_other/)).not.toBeInTheDocument();
    expect(screen.queryByText(/page\.hidden_other/)).not.toBeInTheDocument();
  });

  it('the hidden wording counts direct reports so the number never changes with expansion', async () => {
    await renderRow({ ...MANAGER_PROPS, isExpanded: false });

    expect(screen.getByText(/3 page\.hidden_other/)).toBeInTheDocument();
    expect(screen.queryByText(/page\.reports_other/)).not.toBeInTheDocument();
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

  it('the inert glyph on a non-manager row is not focusable, not clickable and hidden from assistive technology', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    await renderRow({
      ...MANAGER_PROPS,
      hasChildren: false,
      isExpanded: false,
      reportCount: 0,
      onToggle,
    });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    const glyph = screen.getByText('−');
    expect(glyph).toHaveAttribute('aria-hidden', 'true');
    expect(glyph.tagName).not.toBe('BUTTON');
    await user.click(glyph);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('the toggle control is not a tab stop of its own', async () => {
    await renderRow(MANAGER_PROPS);

    const toggle = screen.getByRole('button', { hidden: true });
    expect(toggle).toHaveAttribute('tabindex', '-1');
  });

  it('clicking a row outside the control toggles nothing and selects nothing', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    await renderRow({ ...MANAGER_PROPS, onToggle });

    await user.click(screen.getByText('Ronnen Gurevitch'));

    expect(onToggle).not.toHaveBeenCalled();
    // No selection concept exists on this page - the row declares itself
    // unselected regardless of what was clicked (invariant 108).
    expect(screen.getByRole('treeitem')).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('the report count pluralizes through the catalogue rather than an equality branch', async () => {
    await renderRow({ ...MANAGER_PROPS, reportCount: 1 });
    // Under the key-echoed test catalogue, t('page.reports', {count}) can
    // only land on 'page.reports_one' by way of i18next's own CLDR plural
    // resolution picking that key for count 1 - a component-side
    // `count === 1 ? ... : ...` branch could never produce this exact
    // string, since it has no access to the catalogue's own key suffixes.
    expect(screen.getByText(/1 page\.reports_one/)).toBeInTheDocument();

    cleanup();

    await renderRow({ ...MANAGER_PROPS, reportCount: 2 });
    expect(screen.getByText(/2 page\.reports_other/)).toBeInTheDocument();
  });

  it('a row renders one indent rail for every ancestor level', async () => {
    await renderRow({ ...MANAGER_PROPS, depth: 0 });
    expect(screen.queryByTestId('indent-rail')).not.toBeInTheDocument();

    cleanup();

    await renderRow({ ...MANAGER_PROPS, depth: 2 });
    expect(screen.getAllByTestId('indent-rail')).toHaveLength(2);
  });

  it('each row exposes its level, its 1-based position among its siblings and the number of those siblings, from the row model', async () => {
    await renderRow({
      ...MANAGER_PROPS,
      depth: 2,
      posInSet: 3,
      setSize: 5,
    });

    const row = screen.getByRole('treeitem');
    expect(row).toHaveAttribute('aria-level', '3');
    expect(row).toHaveAttribute('aria-posinset', '3');
    expect(row).toHaveAttribute('aria-setsize', '5');
  });

  it('a manager row exposes whether it is expanded, and a non-manager row exposes no expanded state at all', async () => {
    await renderRow({
      ...MANAGER_PROPS,
      hasChildren: true,
      isExpanded: false,
    });
    expect(screen.getByRole('treeitem')).toHaveAttribute(
      'aria-expanded',
      'false',
    );

    cleanup();

    await renderRow({ ...MANAGER_PROPS, hasChildren: false });
    // Not "false" - genuinely absent, per invariant 147's own distinction
    // between "exposes no expanded state" and "exposes a false one".
    expect(screen.getByRole('treeitem')).not.toHaveAttribute('aria-expanded');
  });
});
