import type { CancelTimer, Clock } from './clock';

export function createSystemClock(): Clock {
  function now(): number {
    return Date.now();
  }

  function setTimer(
    delayMilliseconds: number,
    callback: () => void,
  ): CancelTimer {
    const handle = setTimeout(callback, delayMilliseconds);
    return () => clearTimeout(handle);
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

  return { now, setTimer, wait };
}

function abortError(reason: unknown): Error {
  return reason instanceof Error
    ? reason
    : new DOMException('aborted', 'AbortError');
}
