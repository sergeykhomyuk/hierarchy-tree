const BASE_DELAY_MILLISECONDS = 200;
const MAXIMUM_DELAY_MILLISECONDS = 2000;

export function retryDelayMilliseconds(
  attempt: number,
  randomUnitInterval: number,
): number {
  const exponentialDelay = Math.min(
    MAXIMUM_DELAY_MILLISECONDS,
    BASE_DELAY_MILLISECONDS * 2 ** attempt,
  );
  return exponentialDelay * (0.5 + 0.5 * randomUnitInterval);
}
