export type CancelTimer = () => void;

export type Clock = {
  now(): number;
  setTimer(delayMilliseconds: number, callback: () => void): CancelTimer;
  wait(delayMilliseconds: number, signal?: AbortSignal): Promise<void>;
};
