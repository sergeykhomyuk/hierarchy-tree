import { describe, expect, it } from 'vitest';
import { Locale } from './locale';

describe('Locale', () => {
  it('exposes English and Test members with the correct string values', () => {
    expect(Locale.English).toBe('en');
    expect(Locale.Test).toBe('zxx');
  });

  it('exposes exactly two members', () => {
    expect(Object.keys(Locale).sort()).toEqual(['English', 'Test']);
  });
});
