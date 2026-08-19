import { act } from 'react';
import type { PropsWithChildren, ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import {
  createInternationalization,
  Locale,
} from '@platform/internationalization';
import type { ObservabilityFacade } from '@platform/observability';
import { createFakeClock } from '@shared/testing';
import { buildForest } from './domain/buildForest';
import { flattenVisible } from './domain/flattenVisible';
import type { VisibleRow } from './domain/flattenVisible';
import { parsePersonIdentifier } from './domain/personIdentifier';
import type { PersonIdentifier } from './domain/personIdentifier';
import { loadTranslations } from './loadTranslations';
import { testPerson } from './testing/testPerson';
import { useHierarchyTreeInteractions } from './useHierarchyTreeInteractions';

type HookWrapper = (props: PropsWithChildren) => ReactElement;

type InteractionInputs = {
  readonly rows: readonly VisibleRow[];
  readonly expandedIds: ReadonlySet<PersonIdentifier>;
};

async function createHookWrapper(): Promise<HookWrapper> {
  const i18n = await createInternationalization({
    resources: { common: {} },
    language: Locale.Test,
    observability: { logger: { error: vi.fn() } },
  });
  await loadTranslations(i18n);

  return function HookWrapper({ children }: PropsWithChildren): ReactElement {
    return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
  };
}

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

describe('useHierarchyTreeInteractions', () => {
  it('delegates a missing-row toggle without telemetry or an announcement', async () => {
    const wrapper = await createHookWrapper();
    const observability = createSpyObservability();
    const onToggle = vi.fn();
    const { roots } = buildForest([testPerson(1)]);
    const rows = flattenVisible(roots, new Set<PersonIdentifier>());
    const { result } = renderHook(
      () =>
        useHierarchyTreeInteractions({
          rows,
          accessibleNames: ['First1 Last1'],
          expandedIds: new Set<PersonIdentifier>(),
          observability,
          clock: createFakeClock(),
          onToggle,
          onExpandMany: vi.fn(),
        }),
      { wrapper },
    );
    const missingPersonId = parsePersonIdentifier(999);

    act(() => {
      result.current.handleRowToggle(missingPersonId);
    });

    expect(onToggle).toHaveBeenCalledOnce();
    expect(onToggle).toHaveBeenCalledWith(missingPersonId);
    expect(observability.analytics.track).not.toHaveBeenCalled();
    expect(result.current.announcement).toBe('');
  });

  it('clears the tab stop when the visible row list becomes empty', async () => {
    const wrapper = await createHookWrapper();
    const observability = createSpyObservability();
    const firstPersonId = parsePersonIdentifier(1);
    const { roots } = buildForest([testPerson(1)]);
    const initialRows = flattenVisible(roots, new Set<PersonIdentifier>());
    const { result, rerender } = renderHook(
      ({ rows, expandedIds }: InteractionInputs) =>
        useHierarchyTreeInteractions({
          rows,
          accessibleNames: rows.map(() => ''),
          expandedIds,
          observability,
          clock: createFakeClock(),
          onToggle: vi.fn(),
          onExpandMany: vi.fn(),
        }),
      {
        initialProps: {
          rows: initialRows,
          expandedIds: new Set<PersonIdentifier>(),
        },
        wrapper,
      },
    );
    expect(result.current.tabbableId).toBe(firstPersonId);

    rerender({ rows: [], expandedIds: new Set<PersonIdentifier>() });

    expect(result.current.tabbableId).toBeNull();
  });
});
