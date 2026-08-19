import { describe, expect, it, vi } from 'vitest';
import { createFakeClock, createFakeRandomness } from '@shared/testing';
import { createHttpClient } from '@platform/http';
import type { HttpClientDependencies, Transport } from '@platform/http';
import type { FakeClock } from '@shared/testing';
import type { ObservabilityFacade } from '@platform/observability';
import { fetchPeople, HierarchyResultKind } from './fetchPeople';

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
  clock: FakeClock = createFakeClock(),
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

function validRecord(id: number) {
  return {
    id,
    firstName: `First${id}`,
    lastName: `Last${id}`,
    email: `person${id}@example.test`,
  };
}

describe('fetchPeople', () => {
  it('one bad record is dropped and counted while the rest still builds a forest', async () => {
    const observability = createSpyObservability();
    const transport: Transport = () =>
      Promise.resolve(
        new Response(JSON.stringify([validRecord(1), { id: 'not-a-number' }]), {
          status: 200,
        }),
      );
    const client = createTestClient(transport, observability);

    const result = await fetchPeople(client, 'a'.repeat(32), observability);

    expect(result.kind).toBe(HierarchyResultKind.Data);
    if (result.kind !== HierarchyResultKind.Data) return;
    expect(result.dropped).toBe(1);
    expect(result.roots).toHaveLength(1);
  });

  it('a payload whose every element fails validation returns allRowsInvalid rather than empty', async () => {
    const observability = createSpyObservability();
    const transport: Transport = () =>
      Promise.resolve(
        new Response(JSON.stringify([{ id: 'not-a-number' }]), {
          status: 200,
        }),
      );
    const client = createTestClient(transport, observability);

    const result = await fetchPeople(client, 'a'.repeat(32), observability);

    expect(result.kind).toBe(HierarchyResultKind.Failure);
    if (result.kind !== HierarchyResultKind.Failure) return;
    expect(result.failure).toBe('allRowsInvalid');
  });

  it('a pre-aborted signal returns cancelled and not a failure', async () => {
    const observability = createSpyObservability();
    const transport: Transport = () =>
      Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    const client = createTestClient(transport, observability);
    const controller = new AbortController();
    controller.abort();

    const result = await fetchPeople(
      client,
      'a'.repeat(32),
      observability,
      controller.signal,
    );

    expect(result).toEqual({ kind: HierarchyResultKind.Cancelled });
  });

  it('fetchPeople never throws and never rejects on any outcome', async () => {
    const transports: Transport[] = [
      () => {
        throw new TypeError('network down');
      },
      () => Promise.resolve(new Response(null, { status: 500 })),
      () => Promise.resolve(new Response('not json', { status: 200 })),
      () => Promise.resolve(new Response(JSON.stringify(42), { status: 200 })),
      () => Promise.resolve(new Response(JSON.stringify([]), { status: 200 })),
      () =>
        Promise.resolve(
          new Response(JSON.stringify([validRecord(1)]), { status: 200 }),
        ),
    ];

    for (const transport of transports) {
      const observability = createSpyObservability();
      const clock = createFakeClock();
      const client = createTestClient(transport, observability, clock);

      const resultPromise = fetchPeople(client, 'a'.repeat(32), observability);
      // Harmless when nothing is pending: retryable failures (network, 5xx)
      // need the fake clock advanced past the retry delay before the
      // promise settles.
      await flushMicrotasks();
      await clock.advance(200);

      await expect(resultPromise).resolves.toBeDefined();
    }
  });

  it('a completed load emits exactly one hierarchy-viewed event carrying the counts and the drop count', async () => {
    const observability = createSpyObservability();
    const transport: Transport = () =>
      Promise.resolve(
        new Response(
          JSON.stringify([
            validRecord(1),
            validRecord(2),
            { id: 'not-a-number' },
          ]),
          { status: 200 },
        ),
      );
    const client = createTestClient(transport, observability);

    await fetchPeople(client, 'a'.repeat(32), observability);

    expect(observability.analytics.track).toHaveBeenCalledTimes(1);
    expect(observability.analytics.track).toHaveBeenCalledWith(
      'hierarchy.viewed',
      {
        peopleCount: 2,
        managerCount: 0,
        rootCount: 2,
        droppedCount: 1,
      },
    );
  });

  it('dropped rows are reported once per load with the count, the failing field names and each position (invariant 53)', async () => {
    const observability = createSpyObservability();
    const transport: Transport = () =>
      Promise.resolve(
        new Response(
          JSON.stringify([
            validRecord(1),
            { ...validRecord(2), id: 'not-a-number' },
          ]),
          { status: 200 },
        ),
      );
    const client = createTestClient(transport, observability);

    await fetchPeople(client, 'a'.repeat(32), observability);

    expect(observability.logger.warn).toHaveBeenCalledWith(
      'hierarchy.rows_dropped',
      { count: 1, failures: [{ position: 1, fields: ['id'] }] },
    );
    expect(observability.logger.warn).toHaveBeenCalledTimes(1);
  });

  it('an all-invalid payload also reports the count and each failing position and field names', async () => {
    const observability = createSpyObservability();
    const transport: Transport = () =>
      Promise.resolve(
        new Response(JSON.stringify([{ id: 'not-a-number' }]), {
          status: 200,
        }),
      );
    const client = createTestClient(transport, observability);

    await fetchPeople(client, 'a'.repeat(32), observability);

    expect(observability.logger.warn).toHaveBeenCalledWith(
      'hierarchy.rows_dropped',
      {
        count: 1,
        failures: [
          { position: 0, fields: ['id', 'firstName', 'lastName', 'email'] },
        ],
      },
    );
  });

  it('each anomaly kind is reported with its count', async () => {
    const observability = createSpyObservability();
    const transport: Transport = () =>
      Promise.resolve(
        new Response(
          JSON.stringify([
            { ...validRecord(1), managerId: 1 }, // self-managed
            { ...validRecord(2), managerId: 999 }, // dangling
          ]),
          { status: 200 },
        ),
      );
    const client = createTestClient(transport, observability);

    await fetchPeople(client, 'a'.repeat(32), observability);

    expect(observability.logger.warn).toHaveBeenCalledWith(
      'hierarchy.anomaly_detected',
      { kind: 'selfManaged', count: 1 },
    );
    expect(observability.logger.warn).toHaveBeenCalledWith(
      'hierarchy.anomaly_detected',
      { kind: 'danglingManager', count: 1 },
    );
    // Only the two anomaly kinds that actually occurred are reported - a
    // zero count for duplicateId or cycleBroken stays silent.
    expect(observability.logger.warn).toHaveBeenCalledTimes(2);
  });

  it('a failed load emits one error event with the failure kind and the correlation id', async () => {
    const observability = createSpyObservability();
    const transport: Transport = () =>
      Promise.resolve(new Response(null, { status: 404 }));
    const client = createTestClient(transport, observability);

    await fetchPeople(client, 'a'.repeat(32), observability);

    expect(observability.analytics.track).toHaveBeenCalledTimes(1);
    expect(observability.analytics.track).toHaveBeenCalledWith(
      'hierarchy.load_failed',
      { failureKind: 'http', correlationId: 'a'.repeat(32) },
    );
  });

  it('a cancelled request emits no event', async () => {
    const observability = createSpyObservability();
    const transport: Transport = () =>
      Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    const client = createTestClient(transport, observability);
    const controller = new AbortController();
    controller.abort();

    await fetchPeople(client, 'a'.repeat(32), observability, controller.signal);

    expect(observability.analytics.track).not.toHaveBeenCalled();
    expect(observability.logger.warn).not.toHaveBeenCalled();
  });
});
