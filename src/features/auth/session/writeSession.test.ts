import { describe, expect, it, vi } from 'vitest';
import type { KeyValueStorage } from '@platform/runtime';
import type { ObservabilityFacade } from '@platform/observability';
import { userIdentifier } from '../domain/userIdentifier';
import { readSession } from './readSession';
import { writeSession } from './writeSession';

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

describe('writeSession', () => {
  it('keeps the session readable for the page when persisting fails', () => {
    const observability = createSpyObservability();
    const storage: KeyValueStorage = {
      read: () => null,
      write: () => false,
      remove: () => {},
    };

    writeSession(storage, observability, userIdentifier('user_1'));

    expect(readSession(storage, observability)).toEqual({
      status: 'signedIn',
      userId: 'user_1',
    });
    expect(observability.logger.warn).toHaveBeenCalled();
  });
});
