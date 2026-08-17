import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import {
  createInternationalization,
  Locale,
} from '@platform/internationalization';
import type { ObservabilityFacade } from '@platform/observability';
import { loadTranslations } from './loadTranslations';
import { HierarchyTree } from './HierarchyTree';
import type { HierarchyTreeProps } from './HierarchyTree';
import { buildForest } from './domain/buildForest';
import { parsePersonIdentifier } from './domain/personIdentifier';
import { testPerson } from './testing/testPerson';

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

function brokenPhotoImage(container: HTMLElement): HTMLImageElement {
  // eslint-disable-next-line testing-library/no-node-access -- the row's photo is decorative by design (invariant 101), so it has no accessible role to query through.
  const image = container.querySelector('img');
  if (image === null) throw new Error('expected a photo <img> in the tree');
  return image;
}

async function renderTree(
  props: Omit<HierarchyTreeProps, 'observability'> & {
    observability?: ObservabilityFacade;
  },
) {
  const observability = props.observability ?? createSpyObservability();
  const i18n = await createInternationalization({
    resources: { common: {} },
    language: Locale.Test,
    observability: { logger: { error: vi.fn() } },
  });
  await loadTranslations(i18n);
  const view = render(
    <I18nextProvider i18n={i18n}>
      <HierarchyTree {...props} observability={observability} />
    </I18nextProvider>,
  );
  return { ...view, observability, i18n };
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

  it('collapsing and re-expanding a branch three times produces one photo-failure report for that person', async () => {
    const photoUrl = 'https://example.test/broken-photo.jpg';
    const managerId = parsePersonIdentifier(1);
    const { roots } = buildForest([
      testPerson(1),
      testPerson(2, {
        managerId: 1,
        firstName: 'Broken',
        lastName: 'Photo',
        photo: photoUrl,
      }),
    ]);
    const { rerender, container, observability, i18n } = await renderTree({
      roots,
      expandedIds: new Set([managerId]),
    });

    for (let cycle = 0; cycle < 3; cycle += 1) {
      fireEvent.error(brokenPhotoImage(container));

      // Collapse (unmounts Broken Photo's row) then re-expand (remounts
      // it) - a fresh mount of the same row, not a fresh payload.
      rerender(
        <I18nextProvider i18n={i18n}>
          <HierarchyTree
            roots={roots}
            expandedIds={new Set()}
            observability={observability}
          />
        </I18nextProvider>,
      );
      rerender(
        <I18nextProvider i18n={i18n}>
          <HierarchyTree
            roots={roots}
            expandedIds={new Set([managerId])}
            observability={observability}
          />
        </I18nextProvider>,
      );
    }

    expect(observability.logger.warn).toHaveBeenCalledTimes(1);
  });

  it('a second resolved payload reports the same still-broken photo again', async () => {
    const photoUrl = 'https://example.test/broken-photo.jpg';
    const firstLoad = buildForest([
      testPerson(1, {
        firstName: 'Broken',
        lastName: 'Photo',
        photo: photoUrl,
      }),
    ]);
    const secondLoad = buildForest([
      testPerson(1, {
        firstName: 'Broken',
        lastName: 'Photo',
        photo: photoUrl,
      }),
    ]);
    const {
      unmount,
      container: firstContainer,
      observability,
      i18n,
    } = await renderTree({
      roots: firstLoad.roots,
      expandedIds: new Set(),
    });

    fireEvent.error(brokenPhotoImage(firstContainer));
    expect(observability.logger.warn).toHaveBeenCalledTimes(1);

    // Unmount and mount fresh rather than rerender(): a retry's new
    // payload reaches this component through a NEW Suspense commit (the
    // loader's new promise makes HierarchyPage suspend again, discarding
    // the whole subtree while the fallback shows), not a prop update on
    // the same instance - Avatar's own imageFailed state would otherwise
    // survive a mere rerender() and never show an <img> to fail again.
    unmount();
    const { container: secondContainer } = render(
      <I18nextProvider i18n={i18n}>
        <HierarchyTree
          roots={secondLoad.roots}
          expandedIds={new Set()}
          observability={observability}
        />
      </I18nextProvider>,
    );
    fireEvent.error(brokenPhotoImage(secondContainer));

    expect(observability.logger.warn).toHaveBeenCalledTimes(2);
  });

  it('the photo-failure report carries no photo URL', async () => {
    const photoUrl = 'https://example.test/broken-photo.jpg';
    const { roots } = buildForest([
      testPerson(1, {
        firstName: 'Broken',
        lastName: 'Photo',
        photo: photoUrl,
      }),
    ]);
    const { container, observability } = await renderTree({
      roots,
      expandedIds: new Set(),
    });

    fireEvent.error(brokenPhotoImage(container));

    expect(observability.logger.warn).toHaveBeenCalledTimes(1);
    const [, attributes] =
      vi.mocked(observability.logger.warn).mock.calls[0] ?? [];
    expect(JSON.stringify(attributes)).not.toContain(photoUrl);
  });
});
