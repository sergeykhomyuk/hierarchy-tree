import { describe, expect, it } from 'vitest';
import { createHttpClient, createFetchTransport } from '@platform/http';
import {
  createObservability,
  createCorrelationId,
} from '@platform/observability';
import { createSystemClock, createSystemRandomness } from '@platform/runtime';
import { deriveSecret } from '../../src/features/auth/domain/deriveSecret';
import { fetchSignedInUser } from '../../src/features/auth/data/fetchSignedInUser';
import { lookupUserIdentifier } from '../../src/features/auth/data/lookupUserIdentifier';
import { userIdentifier } from '../../src/features/auth/domain/userIdentifier';

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

  // Invariants 6, 6a, 97e: proves the production request path against a
  // real account rather than a fixture. The two tests below share one
  // account, discovered here and read by the second - not because
  // sharing is desirable in general, but because "derive this account's
  // secret" and "resolve that account's name" are one continuous claim
  // (TECH.md section 9) and re-discovering the account twice would prove
  // nothing extra for twice the live requests. Nothing credential-shaped
  // is written down; the account is whichever the database serves.
  describe('the signed-in user this account resolves to', () => {
    let resolvedUserId: string | undefined;

    it("derives a real account's secret and resolves it to that account's id", async () => {
      const usersResult = await client.request({
        method: 'GET',
        resourcePath: '/users.json',
        parse: parseAsRecord,
      });
      expect(usersResult.outcome).toBe('success');
      if (usersResult.outcome !== 'success') return;

      const entries = Object.entries(usersResult.value);
      const match = entries.find(
        (entry): entry is [string, Record<string, unknown>] => {
          const record = entry[1];
          return (
            typeof record === 'object' &&
            record !== null &&
            typeof (record as Record<string, unknown>).email === 'string' &&
            typeof (record as Record<string, unknown>).password === 'string'
          );
        },
      );
      if (match === undefined) {
        const fieldsByUserId = entries
          .map(([id, record]) => {
            const keys =
              typeof record === 'object' && record !== null
                ? Object.keys(record)
                : [];
            return `${id}: [${keys.join(', ')}]`;
          })
          .join('; ');
        throw new Error(
          `no record in /users.json carries both an email and a password field; found ${fieldsByUserId}`,
        );
      }

      const [id, record] = match;
      const email = record.email as string;
      const password = record.password as string;
      const secret = deriveSecret(email, password);

      const lookup = await lookupUserIdentifier(
        client,
        secret,
        createCorrelationId(randomness),
      );
      expect(lookup.kind).toBe('signedIn');
      if (lookup.kind !== 'signedIn') return;

      // /users.json is the flat, numerically-indexed collection
      // docs/task.md's own element-access example describes (users[1]),
      // not a map keyed by the id /secrets.json resolves to - the two
      // need not (and here do not) agree, so the id this test carries
      // forward is whichever one the real lookup - the same call the
      // app itself makes - actually returned.
      console.log(
        `account at /users.json key "${id}" resolved through /secrets/<derived>.json to id "${String(lookup.userId)}"`,
      );
      resolvedUserId = String(lookup.userId);
    });

    it("resolves the signed-in user's display name through the real schema", async () => {
      if (resolvedUserId === undefined) {
        throw new Error(
          'the prior test did not resolve an account id to look up - see its own failure for why',
        );
      }

      // Calls the app's OWN fetchSignedInUser rather than reimplementing
      // its collection fetch, id-match and schema parse here - this
      // proves the real request path a live regression could actually
      // break, not a hand-rolled copy of it that could drift from the
      // production code and stay green.
      const view = await fetchSignedInUser(
        client,
        userIdentifier(resolvedUserId),
        observability,
      );

      if (view === null) {
        // fetchSignedInUser swallows the failure reason into a warn log
        // by design (invariant 97c never rejects its promise), so on
        // failure this re-fetches raw, diagnostic-only, to fail with the
        // field keys actually found rather than a bare assertion -
        // docs/reference.md:13 records them as unconfirmed.
        const result = await client.request({
          method: 'GET',
          resourcePath: '/users.json',
          parse: (payload) => payload,
        });
        const rawEntries =
          result.outcome === 'success' && Array.isArray(result.value)
            ? result.value
            : [];
        const rawMatch = rawEntries.find(
          (entry) =>
            typeof entry === 'object' &&
            entry !== null &&
            String((entry as Record<string, unknown>).id) === resolvedUserId,
        );
        if (rawMatch === undefined) {
          throw new Error(
            `no record in /users.json has an id field matching "${resolvedUserId}"`,
          );
        }
        const keys = Object.keys(rawMatch);
        throw new Error(
          `the /users.json record with id "${resolvedUserId}" did not match signedInUserSchema (expected id plus string firstName/lastName fields); the fields it actually has are: [${keys.join(', ')}]`,
        );
      }

      expect(view.displayName.trim().length).toBeGreaterThan(0);
    });
  });
});
