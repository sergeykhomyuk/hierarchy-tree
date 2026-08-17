import { parseEmailAddress } from '../domain/emailAddress';
import { parsePersonIdentifier } from '../domain/personIdentifier';
import type { Person } from '../domain/person';
import { personSchema } from './personSchema';

export type ParsePeopleResult =
  | { readonly people: readonly Person[]; readonly dropped: number }
  | 'invalidEnvelope';

// Firebase's REST API renders the same collection as an array (with `null`
// holes at deleted indices) or as an object depending on key sparsity - both
// are tolerated envelopes, not malformed payloads (invariant 42).
function normalizeEnvelope(payload: unknown): readonly unknown[] | null {
  if (payload === null) return [];
  if (Array.isArray(payload)) {
    const entries: readonly unknown[] = payload;
    return entries.filter((entry) => entry !== null);
  }
  if (typeof payload === 'object') {
    const source = payload as Record<string, unknown>;
    return Object.values(source);
  }
  return null;
}

export function parsePeople(payload: unknown): ParsePeopleResult {
  const rawEntries = normalizeEnvelope(payload);
  if (rawEntries === null) return 'invalidEnvelope';

  let dropped = 0;
  const people: Person[] = [];
  for (const entry of rawEntries) {
    const result = personSchema.safeParse(entry);
    if (!result.success) {
      dropped += 1;
      continue;
    }

    const record = result.data;
    people.push({
      id: parsePersonIdentifier(record.id),
      firstName: record.firstName,
      lastName: record.lastName,
      email: parseEmailAddress(record.email),
      ...(record.managerId !== undefined
        ? { managerId: parsePersonIdentifier(record.managerId) }
        : {}),
      ...(record.photo !== undefined ? { photo: record.photo } : {}),
    });
  }

  return { people, dropped };
}
