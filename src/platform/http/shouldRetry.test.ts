import { describe, expect, it } from 'vitest';
import { shouldRetry } from './shouldRetry';

describe('shouldRetry', () => {
  it('retries a GET network failure on the first attempt', () => {
    expect(shouldRetry(0, 'GET', { kind: 'network' })).toBe(true);
  });

  it('retries a GET timeout on the first attempt', () => {
    expect(
      shouldRetry(0, 'GET', { kind: 'timeout', timeoutMilliseconds: 8000 }),
    ).toBe(true);
  });

  it('retries a GET 5xx on the first attempt', () => {
    expect(
      shouldRetry(0, 'GET', {
        kind: 'http',
        status: 503,
        statusDescription: 'server error',
      }),
    ).toBe(true);
  });

  it('does not retry a second attempt', () => {
    expect(shouldRetry(1, 'GET', { kind: 'network' })).toBe(false);
  });

  it('does not retry a non-GET method', () => {
    expect(shouldRetry(0, 'POST', { kind: 'network' })).toBe(false);
  });

  it('does not retry a 4xx response', () => {
    expect(
      shouldRetry(0, 'GET', {
        kind: 'http',
        status: 404,
        statusDescription: 'client error',
      }),
    ).toBe(false);
  });

  it('does not retry a parse failure', () => {
    expect(shouldRetry(0, 'GET', { kind: 'parse' })).toBe(false);
  });
});
