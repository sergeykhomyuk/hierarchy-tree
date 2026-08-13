import { configurationSchema } from './configurationSchema';
import type { RawEnvironment } from './environment';
import type { Configuration } from './configuration';

export type ConfigurationResult =
  | { ok: true; configuration: Configuration }
  | { ok: false; invalidKeys: readonly string[] };

// VITE_LOG_LEVEL and VITE_OBSERVABILITY_SINK default differently per mode
// (development/production/test) - resolved here, before the schema's own
// static .default() acts as the fallback for an unrecognized MODE.
function withModeAppropriateDefaults(raw: RawEnvironment): RawEnvironment {
  const isDevelopment = raw.MODE === 'development';
  const isTest = raw.MODE === 'test';

  return {
    ...raw,
    VITE_LOG_LEVEL: raw.VITE_LOG_LEVEL ?? (isDevelopment ? 'debug' : 'warn'),
    VITE_OBSERVABILITY_SINK:
      raw.VITE_OBSERVABILITY_SINK ??
      (isTest ? 'none' : isDevelopment ? 'console' : 'buffer'),
    VITE_DEVELOPMENT_ROUTES:
      raw.VITE_DEVELOPMENT_ROUTES ?? String(isDevelopment),
  };
}

export function createConfiguration(raw: RawEnvironment): ConfigurationResult {
  const result = configurationSchema.safeParse(
    withModeAppropriateDefaults(raw),
  );

  if (!result.success) {
    // Only the offending key names, never their values (invariant 17).
    const invalidKeys = [
      ...new Set(result.error.issues.map((issue) => String(issue.path[0]))),
    ];
    return { ok: false, invalidKeys };
  }

  const configuration: Configuration = Object.freeze({
    apiBaseUrl: result.data.VITE_API_BASE_URL,
    logLevel: result.data.VITE_LOG_LEVEL,
    observabilitySink: result.data.VITE_OBSERVABILITY_SINK,
    requestTimeoutMilliseconds: result.data.VITE_REQUEST_TIMEOUT_MILLISECONDS,
    telemetryBufferHandle: result.data.VITE_FEATURE_TELEMETRY_BUFFER_HANDLE,
    developmentRoutes: result.data.VITE_DEVELOPMENT_ROUTES,
    basePath: result.data.BASE_URL,
  });

  return { ok: true, configuration };
}
