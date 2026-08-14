import { describe, expect, it } from 'vitest';
import { isDevelopmentBuild, readEnvironment } from './environment';

describe('readEnvironment', () => {
  it('copies BASE_URL, MODE, DEV and PROD into the record as strings', () => {
    const raw = readEnvironment();

    expect(raw.MODE).toBe('test');
    expect(typeof raw.BASE_URL).toBe('string');
    expect(raw.DEV === 'true' || raw.DEV === 'false').toBe(true);
    expect(raw.PROD === 'true' || raw.PROD === 'false').toBe(true);
  });

  it('exposes the build-time development flag', () => {
    expect(typeof isDevelopmentBuild).toBe('boolean');
  });
});
