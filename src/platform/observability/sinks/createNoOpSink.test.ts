import { describe, expect, it } from 'vitest';
import { createNoOpSink } from './createNoOpSink';

describe('createNoOpSink', () => {
  it('does nothing with a written record', () => {
    const sink = createNoOpSink();

    expect(() =>
      sink({ kind: 'log', level: 'debug', event: 'ignored' }),
    ).not.toThrow();
  });
});
