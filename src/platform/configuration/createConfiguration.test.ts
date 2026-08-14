import { describe, expect, it } from 'vitest';
import { createConfiguration } from './createConfiguration';
import type { RawEnvironment } from './environment';

const DEVELOPMENT_ENVIRONMENT: RawEnvironment = {
  MODE: 'development',
  DEV: 'true',
  PROD: 'false',
  BASE_URL: '/',
};

describe('createConfiguration', () => {
  it('createConfiguration succeeds with development-shaped defaults', () => {
    const result = createConfiguration(DEVELOPMENT_ENVIRONMENT);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.configuration).toEqual({
      apiBaseUrl: 'https://gongfetest.firebaseio.com',
      logLevel: 'debug',
      observabilitySink: 'console',
      requestTimeoutMilliseconds: 8000,
      telemetryBufferHandle: true,
      developmentRoutes: true,
      basePath: '/',
    });
  });

  it('configuration is frozen and rejects a runtime write', () => {
    const result = createConfiguration(DEVELOPMENT_ENVIRONMENT);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.isFrozen(result.configuration)).toBe(true);
    expect(() => {
      // @ts-expect-error - Configuration is Readonly at the type level too.
      result.configuration.apiBaseUrl = 'https://evil.example';
    }).toThrow();
  });

  it('an invalid value is named in the message and its value is not', () => {
    const result = createConfiguration({
      ...DEVELOPMENT_ENVIRONMENT,
      VITE_API_BASE_URL: 'not-a-secret-looking-but-still-invalid-url',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.invalidKeys).toContain('VITE_API_BASE_URL');
    expect(JSON.stringify(result.invalidKeys)).not.toContain(
      'not-a-secret-looking-but-still-invalid-url',
    );
  });

  it('defaults to production-shaped values outside development mode', () => {
    const result = createConfiguration({
      MODE: 'production',
      DEV: 'false',
      PROD: 'true',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.configuration.logLevel).toBe('warn');
    expect(result.configuration.observabilitySink).toBe('buffer');
    expect(result.configuration.developmentRoutes).toBe(false);
  });

  it('defaults the observability sink to none under test', () => {
    const result = createConfiguration({
      MODE: 'test',
      DEV: 'false',
      PROD: 'false',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.configuration.observabilitySink).toBe('none');
  });

  it('an explicit VITE_ value overrides the mode-appropriate default', () => {
    const result = createConfiguration({
      ...DEVELOPMENT_ENVIRONMENT,
      VITE_LOG_LEVEL: 'silent',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.configuration.logLevel).toBe('silent');
  });
});
