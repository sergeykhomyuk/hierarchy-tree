import { describe, expect, it, vi } from 'vitest';
import { createFakeClock, createFakeRandomness } from '@shared/testing';
import { createHttpClient } from '@platform/http';
import type { HttpClientDependencies, Transport } from '@platform/http';
import type { ObservabilityFacade } from '@platform/observability';
import { userIdentifier } from '../domain';
import { fetchSignedInUser } from './fetchSignedInUser';

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

function createTestClient(
  transport: Transport,
  observability: ObservabilityFacade,
  clock = createFakeClock(),
): ReturnType<typeof createHttpClient> {
  const dependencies: HttpClientDependencies = {
    transport,
    clock,
    randomness: createFakeRandomness(),
    observability,
    configuration: {
      apiBaseUrl: 'https://api.example.com',
      requestTimeoutMilliseconds: 8000,
    },
    correlationId: () => 'c'.repeat(32),
  };
  return createHttpClient(dependencies);
}

async function flushMicrotasks(times = 50): Promise<void> {
  for (let index = 0; index < times; index += 1) {
    await Promise.resolve();
  }
}

describe('fetchSignedInUser', () => {
  it('resolves to null for every transport failure arm and warns once', async () => {
    // GET retries once on 'network' (shouldRetry.ts), so that case needs
    // the fake clock advanced past the retry delay; a 404 and a malformed
    // body ('parse') do not retry.
    const observability1 = createSpyObservability();
    const clock = createFakeClock();
    const client1 = createTestClient(
      () => {
        throw new TypeError('network down');
      },
      observability1,
      clock,
    );
    const viewPromise = fetchSignedInUser(
      client1,
      userIdentifier('user_1'),
      observability1,
    );
    await flushMicrotasks();
    await clock.advance(200);
    expect(await viewPromise).toBe(null);
    expect(observability1.logger.warn).toHaveBeenCalledTimes(1);

    const nonRetryingTransports: Transport[] = [
      () => Promise.resolve(new Response(null, { status: 404 })),
      () => Promise.resolve(new Response('not json', { status: 200 })),
    ];
    for (const transport of nonRetryingTransports) {
      const observability = createSpyObservability();
      const client = createTestClient(transport, observability);

      const view = await fetchSignedInUser(
        client,
        userIdentifier('user_1'),
        observability,
      );

      expect(view).toBe(null);
      expect(observability.logger.warn).toHaveBeenCalledTimes(1);
    }
  });

  it('resolves to the composed display name for the matching record in the collection', async () => {
    const observability = createSpyObservability();
    const transport: Transport = () =>
      Promise.resolve(
        new Response(
          JSON.stringify([
            { id: 'user_0', firstName: 'Grace', lastName: 'Hopper' },
            { id: 'user_1', firstName: 'Ada', lastName: 'Lovelace' },
          ]),
          { status: 200 },
        ),
      );
    const client = createTestClient(transport, observability);

    const view = await fetchSignedInUser(
      client,
      userIdentifier('user_1'),
      observability,
    );

    expect(view).toEqual({ displayName: 'Ada Lovelace' });
    expect(observability.logger.warn).not.toHaveBeenCalled();
  });

  it('matches a numeric record id against a resolved id of the same value but a different JS type', async () => {
    // The live database serves id as a JSON number (ARCHITECTURE.md's
    // decision log, 2026-08-15), and lookupResultSchema accepts either a
    // string or an int for what the secrets endpoint resolves - so the
    // two can legitimately disagree on JS type for the same logical id.
    // A strict === here (candidate.id === userId) would silently fail
    // this exact case while every OTHER test in this file, which keeps
    // both sides string-typed, would still pass - the real risk
    // fetchSignedInUser's String() coercion exists to close, and the
    // one this milestone's whole collection-fetch fix was about.
    const observability = createSpyObservability();
    const transport: Transport = () =>
      Promise.resolve(
        new Response(
          JSON.stringify([
            { id: 4260010878, firstName: 'Grace', lastName: 'Hopper' },
            { id: 2217873750, firstName: 'Ada', lastName: 'Lovelace' },
          ]),
          { status: 200 },
        ),
      );
    const client = createTestClient(transport, observability);

    const view = await fetchSignedInUser(
      client,
      userIdentifier('2217873750'),
      observability,
    );

    expect(view).toEqual({ displayName: 'Ada Lovelace' });
    expect(observability.logger.warn).not.toHaveBeenCalled();
  });

  it('resolves to null and warns when no record in the collection matches the id', async () => {
    const observability = createSpyObservability();
    const transport: Transport = () =>
      Promise.resolve(
        new Response(
          JSON.stringify([
            { id: 'someone_else', firstName: 'Grace', lastName: 'Hopper' },
          ]),
          { status: 200 },
        ),
      );
    const client = createTestClient(transport, observability);

    const view = await fetchSignedInUser(
      client,
      userIdentifier('user_1'),
      observability,
    );

    expect(view).toBe(null);
    expect(observability.logger.warn).toHaveBeenCalledTimes(1);
    expect(observability.logger.warn).toHaveBeenCalledWith(
      'auth.signed_in_user_unresolved',
      { reason: 'not_found' },
    );
  });
});
