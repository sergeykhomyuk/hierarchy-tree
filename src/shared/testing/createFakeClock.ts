import type { CancelTimer, Clock } from '@platform/runtime';

type PendingTimer = {
  fireAt: number;
  callback: () => void;
};

export type FakeClock = Clock & {
  advance(milliseconds: number): Promise<void>;
};

export function createFakeClock(): FakeClock {
  let currentTime = 0;
  const pendingTimers: PendingTimer[] = [];

  function setTimer(
    delayMilliseconds: number,
    callback: () => void,
  ): CancelTimer {
    const timer: PendingTimer = {
      fireAt: currentTime + delayMilliseconds,
      callback,
    };
    pendingTimers.push(timer);
    return () => {
      const index = pendingTimers.indexOf(timer);
      if (index !== -1) pendingTimers.splice(index, 1);
    };
  }

  function wait(
    delayMilliseconds: number,
    signal?: AbortSignal,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(abortError(signal.reason));
        return;
      }

      const cancel = setTimer(delayMilliseconds, () => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      });

      function onAbort(): void {
        cancel();
        reject(abortError(signal?.reason));
      }

      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  async function advance(milliseconds: number): Promise<void> {
    const target = currentTime + milliseconds;

    while (true) {
      pendingTimers.sort((first, second) => first.fireAt - second.fireAt);
      const next = pendingTimers[0];
      if (!next || next.fireAt > target) break;

      pendingTimers.shift();
      currentTime = next.fireAt;
      next.callback();
      await Promise.resolve();
    }

    currentTime = target;
  }

  return {
    now: () => currentTime,
    setTimer,
    wait,
    advance,
  };
}

function abortError(reason: unknown): Error {
  return reason instanceof Error
    ? reason
    : new DOMException('aborted', 'AbortError');
}
