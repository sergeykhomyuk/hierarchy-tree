import { describe, expect, it } from 'vitest';
import { testPerson } from '../testing/testPerson';
import { personDisplayName } from './personDisplayName';

describe('personDisplayName', () => {
  it('a name is trimmed for display and never re-cased', () => {
    const person = testPerson(1, {
      firstName: 'Justin ',
      lastName: '  uerra',
    });

    expect(personDisplayName(person)).toBe('Justin uerra');
  });

  it('the email is carried exactly as stored', () => {
    const person = testPerson(1, {
      firstName: 'Justin',
      lastName: 'Case',
    });

    expect(person.email).toBe('person1@example.test');
  });

  it('a person whose names are both empty after trimming falls back to their email', () => {
    const person = testPerson(1, { firstName: '  ', lastName: '' });

    expect(personDisplayName(person)).toBe(person.email);
  });
});
