import {
  parseEmailAddress,
  parsePersonIdentifier,
  type Person,
} from '../domain';

export function testPerson(
  id: number,
  overrides: {
    managerId?: number;
    firstName?: string;
    lastName?: string;
    photo?: string;
  } = {},
): Person {
  return {
    id: parsePersonIdentifier(id),
    firstName: overrides.firstName ?? `First${id}`,
    lastName: overrides.lastName ?? `Last${id}`,
    email: parseEmailAddress(`person${id}@example.test`),
    ...(overrides.managerId !== undefined
      ? { managerId: parsePersonIdentifier(overrides.managerId) }
      : {}),
    ...(overrides.photo !== undefined ? { photo: overrides.photo } : {}),
  };
}
