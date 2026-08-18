import { describe, expect, it } from 'vitest';
import { bytesToHex } from './bytesToHex';

describe('bytesToHex', () => {
  it('converts bytes to zero-padded lowercase hex', () => {
    const hex = bytesToHex(new Uint8Array([0, 1, 15, 16, 255]));

    expect(hex).toBe('00010f10ff');
  });

  it('returns an empty string for an empty byte array', () => {
    const hex = bytesToHex(new Uint8Array([]));

    expect(hex).toBe('');
  });
});
