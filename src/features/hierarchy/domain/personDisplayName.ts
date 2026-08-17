import type { Person } from './person';

export function personDisplayName(person: Person): string {
  const parts = [person.firstName, person.lastName]
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

  return parts.length > 0 ? parts.join(' ') : person.email;
}
