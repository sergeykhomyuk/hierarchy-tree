import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakeRandomness } from '@shared/testing';
import { createObservability } from './createObservability';

function createTestObservability(
  overrides: Partial<{
    observabilitySink: 'console' | 'buffer' | 'none';
    logLevel: string;
  }> = {},
) {
  return createObservability({
    configuration: {
      observabilitySink: overrides.observabilitySink ?? 'none',
      logLevel: (overrides.logLevel ?? 'debug') as
        'debug' | 'info' | 'warn' | 'error' | 'silent',
    },
    randomness: createFakeRandomness(),
  });
}

describe('createObservability', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('the facade exposes exactly three keys', () => {
    const { facade } = createTestObservability();

    expect(Object.keys(facade).sort()).toEqual([
      'analytics',
      'logger',
      'tracer',
    ]);
  });

  it('the buffer handle is null unless the buffer sink is selected', () => {
    expect(
      createTestObservability({ observabilitySink: 'console' }).bufferHandle,
    ).toBeNull();
    expect(
      createTestObservability({ observabilitySink: 'none' }).bufferHandle,
    ).toBeNull();
    expect(
      createTestObservability({ observabilitySink: 'buffer' }).bufferHandle,
    ).not.toBeNull();
  });

  it('a throwing property getter does not escape the facade', () => {
    const { facade, bufferHandle } = createTestObservability({
      observabilitySink: 'buffer',
    });
    const throwingAttributes = {
      get accountId(): string {
        throw new Error('boom');
      },
    };

    expect(() =>
      facade.logger.error('thing.failed', throwingAttributes),
    ).not.toThrow();
    expect(bufferHandle?.read()).toEqual([]);
  });

  it('a throwing sink does not escape the facade', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {
      throw new Error('sink failed');
    });
    const { facade } = createTestObservability({
      observabilitySink: 'console',
    });

    expect(() => facade.logger.error('thing.failed')).not.toThrow();
  });

  it('honors the configured log level, producing no sink call below threshold', () => {
    const { facade, bufferHandle } = createTestObservability({
      observabilitySink: 'buffer',
      logLevel: 'warn',
    });

    // eslint-disable-next-line testing-library/no-debugging-utils -- this is ObservabilityFacade's own logger.debug, not screen.debug().
    facade.logger.debug('below.threshold');
    facade.logger.warn('at.threshold');

    const events = bufferHandle
      ?.read()
      .map((record) => (record as { event: string }).event);
    expect(events).toEqual(['at.threshold']);
  });

  it('redacts a logged attribute before it reaches the sink', () => {
    const { facade, bufferHandle } = createTestObservability({
      observabilitySink: 'buffer',
    });

    facade.logger.info('user.signed_in', { password: 'hunter2' });

    const [record] = bufferHandle?.read() ?? [];
    expect(record).toMatchObject({ attributes: { password: '[redacted]' } });
  });

  it('records a timing entry through the tracer', () => {
    const { facade, bufferHandle } = createTestObservability({
      observabilitySink: 'buffer',
    });

    facade.tracer.recordTiming({
      method: 'GET',
      resourcePath: '/things',
      outcome: 'success',
      status: 200,
      durationMilliseconds: 12,
      correlationId: 'a'.repeat(32),
      attempt: 0,
      requestId: 'a'.repeat(32),
    });

    expect(bufferHandle?.read()).toHaveLength(1);
  });

  it('records an analytics event through the tracer catalogue', () => {
    const { facade, bufferHandle } = createTestObservability({
      observabilitySink: 'buffer',
    });

    facade.analytics.track('app.route_viewed', { routeId: 'home' });

    expect(bufferHandle?.read()).toHaveLength(1);
  });

  it('startInteraction returns a 32-character hex correlation id', () => {
    const { facade } = createTestObservability();

    expect(facade.tracer.startInteraction()).toMatch(/^[0-9a-f]{32}$/);
  });
});
