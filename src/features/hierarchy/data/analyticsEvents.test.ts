import { execFileSync } from 'node:child_process';
import { describe, expect, it, vi } from 'vitest';
import type { ObservabilityFacade } from '@platform/observability';
import './analyticsEvents';

describe('the hierarchy analytics augmentation', () => {
  it('the hierarchy events are visible to the observability facade through declaration merging', () => {
    const track = vi.fn();
    const observability: Pick<ObservabilityFacade, 'analytics'> = {
      analytics: { track },
    };

    observability.analytics.track('hierarchy.viewed', {
      peopleCount: 33,
      managerCount: 5,
      rootCount: 2,
      droppedCount: 0,
    });
    observability.analytics.track('hierarchy.load_failed', {
      failureKind: 'network',
      correlationId: 'a'.repeat(32),
    });

    expect(track).toHaveBeenNthCalledWith(1, 'hierarchy.viewed', {
      peopleCount: 33,
      managerCount: 5,
      rootCount: 2,
      droppedCount: 0,
    });
    expect(track).toHaveBeenNthCalledWith(2, 'hierarchy.load_failed', {
      failureKind: 'network',
      correlationId: 'a'.repeat(32),
    });
  });

  it('no hierarchy vocabulary appears in an exported platform identifier', () => {
    const output = execFileSync(
      'node',
      [
        'scripts/assert-domain-vocabulary.mjs',
        'src/platform/observability/analyticsEvents.ts',
      ],
      { encoding: 'utf-8' },
    );

    expect(output).toBe('');
  });
});
