import type { Person } from './person';

// Pick rather than the full Person: TreeRow.tsx calls this with its own
// primitive props (firstName, lastName, email), not a Person object -
// flattenVisible returns a fresh VisibleRow.person on every recompute, so
// a memoized row taking the object itself would re-render on every
// toggle instead of only when a value actually changed (invariant 91).
export function personDisplayName(
  person: Pick<Person, 'firstName' | 'lastName' | 'email'>,
): string {
  const parts = [person.firstName, person.lastName]
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

  return parts.length > 0 ? parts.join(' ') : person.email;
}
