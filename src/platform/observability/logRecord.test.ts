import { describe, expect, it } from 'vitest';
import { logRecord } from './logRecord';

describe('logRecord', () => {
  it('builds a log record with the given level and event', () => {
    expect(logRecord('warn', 'thing.happened', undefined)).toEqual({
      kind: 'log',
      level: 'warn',
      event: 'thing.happened',
    });
  });

  it('includes attributes when given', () => {
    expect(logRecord('info', 'thing.happened', { id: 1 })).toEqual({
      kind: 'log',
      level: 'info',
      event: 'thing.happened',
      attributes: { id: 1 },
    });
  });

  it('omits the attributes key entirely when undefined, rather than setting it to undefined', () => {
    const record = logRecord('error', 'thing.happened', undefined);

    expect('attributes' in record).toBe(false);
  });
});
