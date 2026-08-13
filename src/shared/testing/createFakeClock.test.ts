import { describe, expect, it, vi } from 'vitest';
import { createFakeClock } from './createFakeClock';

describe('createFakeClock', () => {
  it('does not fire a timer until advance says so', () => {
    const clock = createFakeClock();
    const callback = vi.fn();

    clock.setTimer(100, callback);

    expect(callback).not.toHaveBeenCalled();
  });

  it('fires timers in deadline order across a single advance', async () => {
    const clock = createFakeClock();
    const order: string[] = [];

    clock.setTimer(200, () => order.push('second'));
    clock.setTimer(100, () => order.push('first'));

    await clock.advance(200);

    expect(order).toEqual(['first', 'second']);
  });

  it('does not fire a cancelled timer', async () => {
    const clock = createFakeClock();
    const callback = vi.fn();

    const cancel = clock.setTimer(100, callback);
    cancel();
    await clock.advance(100);

    expect(callback).not.toHaveBeenCalled();
  });

  it('advances now() by exactly the requested amount', async () => {
    const clock = createFakeClock();

    await clock.advance(150);

    expect(clock.now()).toBe(150);
  });

  it('wait resolves once advance reaches the delay', async () => {
    const clock = createFakeClock();
    const waitPromise = clock.wait(50);

    await clock.advance(50);

    await expect(waitPromise).resolves.toBeUndefined();
  });

  it('wait rejects immediately for an already-aborted signal', async () => {
    const clock = createFakeClock();
    const controller = new AbortController();
    controller.abort();

    await expect(clock.wait(50, controller.signal)).rejects.toBeDefined();
  });

  it('wait rejects when the signal aborts before the delay elapses', async () => {
    const clock = createFakeClock();
    const controller = new AbortController();

    const waitPromise = clock.wait(1000, controller.signal);
    controller.abort();

    await expect(waitPromise).rejects.toBeDefined();
  });
});
