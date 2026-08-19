import {
  parseEmailAddress,
  parsePersonIdentifier,
  type Person,
} from '../domain';
import { personSchema } from './personSchema';

export const INVALID_ENVELOPE = 'invalidEnvelope';

// One entry per dropped element: its position in the normalized envelope
// and the failing field names - never a value (invariant 53). Position is
// what a deduped, envelope-wide field-name set (this file's previous
// shape) cannot express: which element failed, not only what kind of
// failure occurred somewhere in the payload.
export type ParsePeopleFailure = {
  readonly position: number;
  readonly fields: readonly string[];
};

export type ParsePeopleResult =
  | {
      readonly people: readonly Person[];
      readonly dropped: number;
      readonly failures: readonly ParsePeopleFailure[];
    }
  | typeof INVALID_ENVELOPE;

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
  if (rawEntries === null) return INVALID_ENVELOPE;

  const failures: ParsePeopleFailure[] = [];
  const people: Person[] = [];
  for (const [position, entry] of rawEntries.entries()) {
    const result = personSchema.safeParse(entry);
    if (!result.success) {
      failures.push({
        position,
        fields: [
          ...new Set(result.error.issues.map((issue) => issue.path.join('.'))),
        ],
      });
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

  return { people, dropped: failures.length, failures };
}
