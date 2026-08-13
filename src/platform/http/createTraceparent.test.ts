import { describe, expect, it } from 'vitest';
import { createFakeRandomness } from '@shared/testing';
import { createTraceparent } from './createTraceparent';

describe('createTraceparent', () => {
  it('produces a valid W3C traceparent carrying the given trace id', () => {
    const traceId = 'a'.repeat(32);
    const traceparent = createTraceparent(traceId, createFakeRandomness());

    expect(traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    expect(traceparent).toContain(traceId);
  });

  it('generates a fresh span id on every call', () => {
    const traceId = 'b'.repeat(32);
    const randomness = createFakeRandomness();

    const first = createTraceparent(traceId, randomness);
    const second = createTraceparent(traceId, randomness);

    expect(first).not.toBe(second);
  });
});
