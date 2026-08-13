import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSystemClock } from './createSystemClock';

describe('createSystemClock', () => {
  it('now returns a plausible, non-decreasing epoch millisecond value', () => {
    const clock = createSystemClock();
    const EPOCH_MILLISECONDS_FOR_YEAR_2020 = 1_577_836_800_000;

    const first = clock.now();
    const second = clock.now();

    expect(first).toBeGreaterThan(EPOCH_MILLISECONDS_FOR_YEAR_2020);
    expect(second).toBeGreaterThanOrEqual(first);
  });

  describe('with fake timers', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('setTimer invokes its callback after the delay elapses', () => {
      const clock = createSystemClock();
      const callback = vi.fn();

      clock.setTimer(100, callback);
      vi.advanceTimersByTime(99);
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(callback).toHaveBeenCalledOnce();
    });

    it('the cancel function returned by setTimer prevents the callback from firing', () => {
      const clock = createSystemClock();
      const callback = vi.fn();

      const cancel = clock.setTimer(100, callback);
      cancel();
      vi.advanceTimersByTime(100);

      expect(callback).not.toHaveBeenCalled();
    });

    it('wait resolves once the delay elapses', async () => {
      const clock = createSystemClock();

      const waiting = clock.wait(50);
      await vi.advanceTimersByTimeAsync(50);

      await expect(waiting).resolves.toBeUndefined();
    });

    it('wait rejects immediately when the signal is already aborted', async () => {
      const clock = createSystemClock();
      const controller = new AbortController();
      controller.abort();

      await expect(clock.wait(50, controller.signal)).rejects.toThrow();
    });

    it('wait rejects when the signal aborts before the delay elapses', async () => {
      const clock = createSystemClock();
      const controller = new AbortController();

      const waiting = clock.wait(100, controller.signal);
      controller.abort();

      await expect(waiting).rejects.toThrow();
    });
  });
});
