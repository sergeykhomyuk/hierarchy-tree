import { describe, expect, it, vi } from 'vitest';
import { createBackForwardRestore } from './createBackForwardRestore';

describe('createBackForwardRestore', () => {
  it('revalidates when a persisted page is restored', () => {
    const revalidate = vi.fn();

    createBackForwardRestore({ revalidate });
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false }));
    expect(revalidate).not.toHaveBeenCalled();

    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    expect(revalidate).toHaveBeenCalledTimes(1);
  });
});
