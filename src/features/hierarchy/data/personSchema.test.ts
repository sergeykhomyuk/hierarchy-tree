import { describe, expect, it } from 'vitest';
import { personSchema } from './personSchema';

describe('personSchema', () => {
  it('the parsed person carries no password field', () => {
    const result = personSchema.parse({
      id: 1,
      firstName: 'Justin',
      lastName: 'Case',
      email: 'justin@example.test',
      password: 'top-secret',
    });

    expect(result).not.toHaveProperty('password');
  });

  it('each required field missing in turn drops the row', () => {
    const email = 'justin@example.test';

    expect(
      personSchema.safeParse({ firstName: 'Justin', lastName: 'Case', email })
        .success,
    ).toBe(false);
    expect(
      personSchema.safeParse({ id: 1, lastName: 'Case', email }).success,
    ).toBe(false);
    expect(
      personSchema.safeParse({ id: 1, firstName: 'Justin', email }).success,
    ).toBe(false);
    expect(
      personSchema.safeParse({ id: 1, firstName: 'Justin', lastName: 'Case' })
        .success,
    ).toBe(false);
  });

  it('each optional field mistyped in turn drops the row', () => {
    const base = {
      id: 1,
      firstName: 'Justin',
      lastName: 'Case',
      email: 'justin@example.test',
    };

    expect(
      personSchema.safeParse({ ...base, managerId: 'not-a-number' }).success,
    ).toBe(false);
    expect(personSchema.safeParse({ ...base, photo: 42 }).success).toBe(false);
  });

  it('an id that is negative, fractional or beyond the safe integer range is rejected', () => {
    const base = {
      firstName: 'Justin',
      lastName: 'Case',
      email: 'justin@example.test',
    };

    expect(personSchema.safeParse({ ...base, id: 0 }).success).toBe(false);
    expect(personSchema.safeParse({ ...base, id: -1 }).success).toBe(false);
    expect(personSchema.safeParse({ ...base, id: 1.5 }).success).toBe(false);
    expect(
      personSchema.safeParse({ ...base, id: Number.MAX_SAFE_INTEGER + 1 })
        .success,
    ).toBe(false);
  });

  it('a validation failure reports the failing field names and the element position and no values', () => {
    const records = [
      {
        id: 1,
        firstName: 'Justin',
        lastName: 'Case',
        email: 'justin@example.test',
      },
      {
        id: 'not-a-number',
        firstName: 'Uerra',
        lastName: '',
        email: 'uerra@example.test',
        password: 'top-secret',
      },
    ];

    const failures = records.flatMap((record, position) => {
      const result = personSchema.safeParse(record);
      if (result.success) return [];
      return [
        {
          position,
          fields: result.error.issues.map((issue) => issue.path.join('.')),
        },
      ];
    });

    expect(failures).toEqual([{ position: 1, fields: ['id'] }]);
    expect(JSON.stringify(failures)).not.toContain('top-secret');
    expect(JSON.stringify(failures)).not.toContain('not-a-number');
  });
});
