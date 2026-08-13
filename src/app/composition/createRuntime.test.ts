import { afterEach, describe, expect, it } from 'vitest';
import type { Configuration } from '@platform/configuration';
import { createRuntime } from './createRuntime';

const TEST_CONFIGURATION: Configuration = Object.freeze({
  apiBaseUrl: 'https://example.test',
  logLevel: 'silent',
  observabilitySink: 'buffer',
  requestTimeoutMilliseconds: 8000,
  telemetryBufferHandle: true,
  developmentRoutes: false,
  basePath: '/',
});

afterEach(() => {
  globalThis.__hierarchyTreeTelemetry = undefined;
});

describe('createRuntime', () => {
  it('builds a frozen runtime exposing configuration, observability, http, i18n and the interaction tracker', async () => {
    const runtime = await createRuntime(TEST_CONFIGURATION);

    expect(runtime.configuration).toBe(TEST_CONFIGURATION);
    expect(runtime.observability.logger).toBeDefined();
    expect(typeof runtime.http.request).toBe('function');
    expect(runtime.i18n.isInitialized).toBe(true);
    expect(runtime.interactionTracker.attach).toBeInstanceOf(Function);
    expect(Object.isFrozen(runtime)).toBe(true);
  });

  it('attaches the telemetry buffer handle to globalThis when the sink is buffer and the flag is enabled', async () => {
    await createRuntime(TEST_CONFIGURATION);

    expect(globalThis.__hierarchyTreeTelemetry?.read).toBeInstanceOf(Function);
  });

  it('does not attach a telemetry buffer handle when the flag is disabled', async () => {
    await createRuntime({
      ...TEST_CONFIGURATION,
      telemetryBufferHandle: false,
    });

    expect(globalThis.__hierarchyTreeTelemetry).toBeUndefined();
  });

  it('an http request made with no active interaction resolves rather than throwing for want of a correlation id', async () => {
    const runtime = await createRuntime(TEST_CONFIGURATION);

    expect(runtime.interactionTracker.currentCorrelationId()).toBeNull();

    // globalThis.fetch throws in every unit test (vitest.setup.ts), so a
    // real network failure is expected here - what this proves is that
    // building the client's per-call correlation id with no interaction
    // active resolves to a real network failure rather than a TypeError
    // from a missing id. POST is not retried (shouldRetry), so this stays
    // a single real-clock attempt rather than paying a real backoff delay.
    const result = await runtime.http.request({
      method: 'POST',
      resourcePath: '/probe',
      parse: (value) => value,
    });

    expect(result).toEqual({
      outcome: 'failure',
      failure: { kind: 'network' },
    });
  });
});
