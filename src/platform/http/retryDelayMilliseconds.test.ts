import { describe, expect, it } from 'vitest';
import { retryDelayMilliseconds } from './retryDelayMilliseconds';

describe('retryDelayMilliseconds', () => {
  it('computes the minimum jitter bound at attempt 0', () => {
    expect(retryDelayMilliseconds(0, 0)).toBe(100);
  });

  it('computes the maximum jitter bound at attempt 0', () => {
    expect(retryDelayMilliseconds(0, 1)).toBe(200);
  });

  it('doubles the base delay at attempt 1', () => {
    expect(retryDelayMilliseconds(1, 0)).toBe(200);
    expect(retryDelayMilliseconds(1, 1)).toBe(400);
  });

  it('bounds the delay at the maximum for a large attempt', () => {
    expect(retryDelayMilliseconds(10, 1)).toBe(2000);
  });
});
