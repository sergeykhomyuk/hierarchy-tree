import { afterEach, describe, expect, it, vi } from 'vitest';
import { createConsoleSink } from './createConsoleSink';

describe('createConsoleSink', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes a log record through the matching console method', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sink = createConsoleSink();

    sink({
      kind: 'log',
      level: 'warn',
      event: 'thing.happened',
      attributes: { id: 1 },
    });

    expect(spy).toHaveBeenCalledWith('thing.happened', { id: 1 });
  });

  it('writes a non-log record through console.debug', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const sink = createConsoleSink();

    sink({
      kind: 'analytics',
      name: 'app.route_viewed',
      payload: { routeId: 'home' },
    });

    expect(spy).toHaveBeenCalled();
  });
});
