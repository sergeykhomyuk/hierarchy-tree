import { describe, expect, it } from 'vitest';
import { parsePeople } from './parsePeople';

function validRecord(id: number) {
  return {
    id,
    firstName: `First${id}`,
    lastName: `Last${id}`,
    email: `person${id}@example.test`,
  };
}

describe('parsePeople', () => {
  it('an array carrying a null hole produces no dropped row', () => {
    const result = parsePeople([validRecord(1), null, validRecord(2)]);

    expect(result).not.toBe('invalidEnvelope');
    if (result === 'invalidEnvelope') return;
    expect(result.people.map((person) => person.id)).toEqual([1, 2]);
    expect(result.dropped).toBe(0);
  });

  it('an object-keyed envelope is read in its own key order', () => {
    const result = parsePeople({
      abc123: validRecord(1),
      xyz789: validRecord(2),
    });

    expect(result).not.toBe('invalidEnvelope');
    if (result === 'invalidEnvelope') return;
    expect(result.people.map((person) => person.id)).toEqual([1, 2]);
  });

  it('null, an empty array, an array of only holes and an empty object all mean no users', () => {
    for (const payload of [null, [], [null, null], {}]) {
      const result = parsePeople(payload);
      expect(result).not.toBe('invalidEnvelope');
      if (result === 'invalidEnvelope') continue;
      expect(result.people).toEqual([]);
      expect(result.dropped).toBe(0);
    }
  });

  it('a string, a number and a boolean each produce invalidEnvelope', () => {
    expect(parsePeople('not a list')).toBe('invalidEnvelope');
    expect(parsePeople(42)).toBe('invalidEnvelope');
    expect(parsePeople(true)).toBe('invalidEnvelope');
  });

  it('which envelope arrived never changes the surviving records or their order', () => {
    const asArray = parsePeople([validRecord(1), validRecord(2)]);
    const asObject = parsePeople({
      first: validRecord(1),
      second: validRecord(2),
    });

    expect(asArray).not.toBe('invalidEnvelope');
    expect(asObject).not.toBe('invalidEnvelope');
    if (asArray === 'invalidEnvelope' || asObject === 'invalidEnvelope') {
      return;
    }
    expect(asArray.people).toEqual(asObject.people);
  });
});
