import * as z from 'zod/mini';

// A .default() on every key (invariant 18) - a checkout with no .env file
// validates. zod/mini is imported for its tree-shakable build (the entry
// budget - see TECH.md 7.3).
export const configurationSchema = z.object({
  VITE_API_BASE_URL: z._default(
    z.url({ protocol: /^https$/ }),
    'https://gongfetest.firebaseio.com',
  ),
  VITE_LOG_LEVEL: z._default(
    z.enum(['debug', 'info', 'warn', 'error', 'silent']),
    'debug',
  ),
  VITE_OBSERVABILITY_SINK: z._default(
    z.enum(['console', 'buffer', 'none']),
    'console',
  ),
  VITE_REQUEST_TIMEOUT_MILLISECONDS: z._default(
    z.coerce.number().check(z.minimum(1), z.maximum(60_000)),
    8000,
  ),
  VITE_FEATURE_TELEMETRY_BUFFER_HANDLE: z._default(z.stringbool(), true),
  VITE_DEVELOPMENT_ROUTES: z._default(z.stringbool(), true),
  BASE_URL: z._default(z.string(), '/'),
});
