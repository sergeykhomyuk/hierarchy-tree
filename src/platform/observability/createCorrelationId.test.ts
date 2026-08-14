import { describe, expect, it } from 'vitest';
import { createFakeRandomness } from '@shared/testing';
import { createCorrelationId } from './createCorrelationId';

describe('createCorrelationId', () => {
  it('renders 16 random bytes as 32 hex characters', () => {
    const id = createCorrelationId(createFakeRandomness());

    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  it('produces a different id on each call from the same randomness source', () => {
    const randomness = createFakeRandomness();

    const first = createCorrelationId(randomness);
    const second = createCorrelationId(randomness);

    expect(first).not.toBe(second);
  });
});
