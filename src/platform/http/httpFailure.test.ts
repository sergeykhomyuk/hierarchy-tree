import { describe, expect, it } from 'vitest';
import type { HttpFailure } from './httpFailure';

function describeFailure(failure: HttpFailure): string {
  switch (failure.kind) {
    case 'network':
      return 'network';
    case 'timeout':
      return `timeout after ${failure.timeoutMilliseconds}ms`;
    case 'http':
      return `http ${failure.status}`;
    case 'parse':
      return 'parse';
  }
}

describe('HttpFailure', () => {
  it('the failure union is exhaustive without a default branch', () => {
    expect(describeFailure({ kind: 'network' })).toBe('network');
    expect(
      describeFailure({ kind: 'timeout', timeoutMilliseconds: 8000 }),
    ).toBe('timeout after 8000ms');
    expect(
      describeFailure({
        kind: 'http',
        status: 500,
        statusDescription: 'server error',
      }),
    ).toBe('http 500');
    expect(describeFailure({ kind: 'parse' })).toBe('parse');
  });
});
