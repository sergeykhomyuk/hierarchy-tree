import { describe, expect, it } from 'vitest';
import { createHttpClient, createFetchTransport } from '@platform/http';
import {
  createObservability,
  createCorrelationId,
} from '@platform/observability';
import { createSystemClock, createSystemRandomness } from '@platform/runtime';

// Outside every default Vitest project (vitest.config.ts's `tooling`
// project matches `scripts/*.test.ts` only, one path segment) and
// outside src, so no gating command can collect this by accident
// (invariants 115, 116). Runs only under `npm run smoke:live`, from the
// CI live-smoke job's own workflow_dispatch trigger.
//
// Uses the real client and the real fetch-transport against the real
// backend - no fake transport, no route mock - which is the point: this
// is the one suite that proves the production request path actually
// reaches the live database, rather than a fake that always agreed with
// itself.
const randomness = createSystemRandomness();
const clock = createSystemClock();
const { facade: observability } = createObservability({
  configuration: { observabilitySink: 'console', logLevel: 'warn' },
  randomness,
});
const client = createHttpClient({
  transport: createFetchTransport(),
  clock,
  randomness,
  observability,
  configuration: {
    apiBaseUrl: 'https://gongfetest.firebaseio.com',
    requestTimeoutMilliseconds: 8000,
  },
  correlationId: () => createCorrelationId(randomness),
});

function parseAsRecord(payload: unknown): Record<string, unknown> {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('expected the response to parse as a JSON object');
  }
  return payload as Record<string, unknown>;
}

describe('live smoke', () => {
  it('the real backend serves users.json as JSON with at least one record', async () => {
    const result = await client.request({
      method: 'GET',
      resourcePath: '/users.json',
      parse: parseAsRecord,
    });

    expect(result.outcome).toBe('success');
    if (result.outcome !== 'success') return;

    const userIds = Object.keys(result.value);
    expect(userIds.length).toBeGreaterThan(0);

    // Invariant 116b: the field names are printed for a human to read,
    // nothing here asserts on them - the schema is exactly what this
    // job exists to observe, not to encode.
    const firstUser = result.value[userIds[0] as string];
    const fieldNames =
      typeof firstUser === 'object' && firstUser !== null
        ? Object.keys(firstUser)
        : [];
    // The printed field names ARE the deliverable of this job (invariant 116a).
    console.log('users record field names:', fieldNames);
  });

  it('the real backend serves secrets.json as JSON', async () => {
    const result = await client.request({
      method: 'GET',
      resourcePath: '/secrets.json',
      parse: parseAsRecord,
    });

    expect(result.outcome).toBe('success');
  });
});
