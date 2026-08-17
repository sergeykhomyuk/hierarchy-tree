import { parseEmailAddress } from '../domain/emailAddress';
import { parsePersonIdentifier } from '../domain/personIdentifier';
import type { Person } from '../domain/person';

export function testPerson(
  id: number,
  overrides: { managerId?: number; firstName?: string; lastName?: string } = {},
): Person {
  return {
    id: parsePersonIdentifier(id),
    firstName: overrides.firstName ?? `First${id}`,
    lastName: overrides.lastName ?? `Last${id}`,
    email: parseEmailAddress(`person${id}@example.test`),
    ...(overrides.managerId !== undefined
      ? { managerId: parsePersonIdentifier(overrides.managerId) }
      : {}),
  };
}
