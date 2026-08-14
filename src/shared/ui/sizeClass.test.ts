import { describe, expect, it } from 'vitest';
import { sizeClass } from './sizeClass';
import { SkeletonSize } from './skeletonSize';

describe('sizeClass', () => {
  it('has a complete class-name entry for every SkeletonSize step', () => {
    for (const step of Object.values(SkeletonSize)) {
      expect(
        sizeClass[step],
        `missing sizeClass entry for "${step}"`,
      ).toBeTruthy();
    }
  });

  it('entries are complete literal class strings, not template fragments', () => {
    for (const value of Object.values(sizeClass)) {
      expect(value).not.toContain('${');
      expect(value).not.toMatch(/^w-\d+$/);
    }
  });
});
