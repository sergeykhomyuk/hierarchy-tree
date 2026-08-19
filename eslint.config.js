import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import i18next from 'eslint-plugin-i18next';
import testingLibrary from 'eslint-plugin-testing-library';
import playwright from 'eslint-plugin-playwright';
import eslintConfigPrettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

const USE_HTTP_CLIENT_MESSAGE =
  'Use the http client. Only platform/http/createFetchTransport.ts calls fetch.';
const INJECT_CLOCK_MESSAGE =
  'Inject Clock instead. Only createSystemClock.ts may call this.';
const NO_PERSISTENCE_MESSAGE =
  'Nothing in this phase persists anything. See invariant 128.';

// Single-reader rule entries (section 2.4), named so each override below
// can re-enable only the one identifier its module owns rather than the
// whole rule.
const NETWORK_GLOBALS = [
  { name: 'fetch', message: USE_HTTP_CLIENT_MESSAGE },
  { name: 'XMLHttpRequest', message: USE_HTTP_CLIENT_MESSAGE },
  { name: 'WebSocket', message: USE_HTTP_CLIENT_MESSAGE },
  { name: 'EventSource', message: USE_HTTP_CLIENT_MESSAGE },
];
const CLOCK_GLOBALS = [
  { name: 'setTimeout', message: INJECT_CLOCK_MESSAGE },
  { name: 'setInterval', message: INJECT_CLOCK_MESSAGE },
  { name: 'requestAnimationFrame', message: INJECT_CLOCK_MESSAGE },
];
const STORAGE_GLOBALS = [
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'caches',
].map((name) => ({
  name,
  message: NO_PERSISTENCE_MESSAGE,
}));

const NETWORK_PROPERTIES = [
  { object: 'window', property: 'fetch', message: USE_HTTP_CLIENT_MESSAGE },
  {
    object: 'globalThis',
    property: 'fetch',
    message: USE_HTTP_CLIENT_MESSAGE,
  },
  {
    object: 'navigator',
    property: 'sendBeacon',
    message: USE_HTTP_CLIENT_MESSAGE,
  },
];
const CLOCK_PROPERTIES = [
  {
    object: 'Date',
    property: 'now',
    message:
      'Inject Clock.now() instead. Only createSystemClock.ts may call this.',
  },
  {
    object: 'performance',
    property: 'now',
    message:
      'Inject Clock.now() instead. Only createSystemClock.ts may call this.',
  },
];
const RANDOMNESS_PROPERTIES = [
  {
    object: 'Math',
    property: 'random',
    message:
      'Inject Randomness instead. Only createSystemRandomness.ts may call this.',
  },
  {
    object: 'crypto',
    property: 'getRandomValues',
    message:
      'Inject Randomness instead. Only createSystemRandomness.ts may call this.',
  },
];
const STORAGE_PROPERTIES = ['window', 'globalThis', 'navigator'].flatMap(
  (object) =>
    [
      'localStorage',
      'sessionStorage',
      'indexedDB',
      'caches',
      'serviceWorker',
    ].map((property) => ({
      object,
      property,
      message: NO_PERSISTENCE_MESSAGE,
    })),
);

const ENV_SYNTAX = {
  selector:
    'MemberExpression[object.type="MetaProperty"][object.meta.name="import"][object.property.name="meta"][property.name="env"]',
  message:
    'Read the environment only in src/platform/configuration/environment.ts.',
};
const SEND_BEACON_SYNTAX = {
  selector: 'MemberExpression[property.name="sendBeacon"]',
  message: USE_HTTP_CLIENT_MESSAGE,
};
const IMAGE_SRC_SYNTAX = {
  selector:
    'AssignmentExpression[left.type="MemberExpression"][left.property.name="src"][left.object.type="NewExpression"][left.object.callee.name="Image"]',
  message: USE_HTTP_CLIENT_MESSAGE,
};
const DATE_SYNTAX = {
  selector: 'NewExpression[callee.name="Date"][arguments.length=0]',
  message:
    'Inject Clock.now() instead of `new Date()`. Only createSystemClock.ts may call it.',
};
const TELEMETRY_SYNTAX = {
  selector: 'MemberExpression[property.name="__hierarchyTreeTelemetry"]',
  message:
    'The telemetry handle is attached only by app/composition/createRuntime.ts.',
};

const FEATURE_DEEP_IMPORT_PATTERNS = [
  {
    group: ['@features/*/*', '@features/*/**'],
    message:
      'Import a feature only through its public entry: @features/<name>.',
  },
  {
    group: ['**/features/**', '../features/*', '../../features/*'],
    message:
      'Import features through the @features/<name> alias, never a relative path.',
  },
];
const SINKS_IMPORT_PATTERN = {
  group: ['@platform/observability/sinks/*', '**/observability/sinks/*'],
  message:
    'Sinks are constructed only by createSink.ts (platform/observability).',
};

export default defineConfig([
  // Generated directories a repeat local `npm run verify` would otherwise
  // leave on disk for the next `lint` step to trip over - the same set
  // .gitignore already excludes, beyond just the build output.
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results']),
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Type-aware linting (invariant 104), scoped to the files that belong
    // to a TypeScript project - projectService: true reports anything else
    // as outside one and fails on the first file it can't place.
    files: ['src/**/*.{ts,tsx}', 'e2e/**/*.ts'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },
  {
    files: ['**/*.js', 'scripts/**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    // mode: 'jsx-only' plus an explicit exclude list keeps className (and
    // Tailwind's utility strings) out of the check while aria-label, alt
    // and title - what's actually user-visible - stay checked.
    files: ['src/**/*.{ts,tsx}'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-only',
          'jsx-attributes': {
            exclude: [
              'className',
              'data-testid',
              'role',
              'type',
              'id',
              'name',
              'href',
              'rel',
              'referrerPolicy',
              'loading',
              'width',
              'height',
              'autoComplete',
              'dir',
              'lang',
            ],
          },
        },
      ],
    },
  },
  {
    // Invariant 60 governs what SHIPS; a test fixture's literal prop
    // values and text ("variant=\"primary\"", a Button's "Save" label in
    // a render() call) are never shipped, so the rule that catches a
    // hardcoded copy string in a real component would otherwise flag
    // ordinary test data instead - the kit's own literal-string guard
    // (scripts/eslint-configuration.test.ts) checks the real component
    // files, not their tests, which is the actual invariant 85 surface.
    files: ['src/**/*.test.{ts,tsx}'],
    extends: [testingLibrary.configs['flat/react']],
    rules: { 'i18next/no-literal-string': 'off' },
  },
  {
    // testing-harness (src/app/testing/**) is the same "never ships"
    // case as *.test.tsx above, just not named that way: kitStates.tsx
    // is imported by unit tests and by the dev-only kit route, which
    // invariant 86b's build-output check proves never reaches dist/.
    files: ['src/app/testing/**/*.{ts,tsx}'],
    rules: { 'i18next/no-literal-string': 'off' },
  },
  {
    // Route wrapper modules re-export a component AND its feature's
    // loadTranslations under one name, so routeDefinitions.ts's lazy()
    // reaches both through a single dynamic import() - two per route
    // would split the feature's module graph into an extra chunk each,
    // breaking the clean route-chunk -> catalogue-chunk graph invariant
    // 62's chunk-graph check rests on. Fast Refresh does not apply to a
    // module loaded only through React Router's lazy(), so the usual
    // one-component-per-file convention buys nothing here.
    files: ['src/app/routing/routes/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['e2e/**/*.ts'],
    extends: [playwright.configs['flat/recommended']],
  },
  {
    // eslint-plugin-boundaries 7.2.0 deprecates `element-types`, `mode`,
    // string/tuple element selectors, the `rules` option and `${...}`
    // templates (confirmed against the installed package - `npx eslint .`
    // names each one explicitly). Configured against the current
    // `dependencies`/`policies`/object-selector API rather than the
    // deprecated one TECH.md's draft example used.
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      // eslint-import-resolver-node's default extension list doesn't
      // include .ts/.tsx and knows nothing of tsconfig path aliases -
      // without a resolver that does, every extensionless relative import
      // (including `./bootstrap` inside the SAME element) comes back
      // fully unresolved and boundaries/no-unknown-dependencies fires on
      // it. Confirmed empirically with ESLINT_PLUGIN_BOUNDARIES_DEBUG=true.
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
      'boundaries/include': ['src/**/*.{ts,tsx}'],
      'boundaries/ignore': ['src/vite-env.d.ts'],
      'boundaries/elements': [
        { type: 'testing-harness', pattern: 'src/app/testing/**' },
        { type: 'app', pattern: 'src/app/**' },
        {
          type: 'feature',
          pattern: 'src/features/*/**',
          capture: ['featureName'],
        },
        // Matched before the general `shared` pattern below: a distinct,
        // zero-dependency element so `platform` can depend on it (see the
        // platform policy) without opening a shared<->platform import cycle
        // - shared/testing still imports platform types for its fakes, so
        // the rest of `shared` stays off-limits to `platform` (ARCHITECTURE.md
        // decision log).
        { type: 'shared-utils', pattern: 'src/shared/utils/**' },
        { type: 'shared', pattern: 'src/shared/**' },
        { type: 'platform', pattern: 'src/platform/**' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          message:
            '{{from.type}} may not import {{to.type}} ({{dependency.source}})',
          policies: [
            {
              from: { element: { type: 'testing-harness' } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: [
                        'app',
                        'feature',
                        'shared-utils',
                        'shared',
                        'platform',
                        'testing-harness',
                      ],
                    },
                  },
                },
              },
            },
            {
              from: { element: { type: 'app' } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: [
                        'app',
                        'feature',
                        'shared-utils',
                        'shared',
                        'platform',
                        'testing-harness',
                      ],
                    },
                  },
                },
              },
            },
            {
              from: { element: { type: 'feature' } },
              allow: [
                {
                  to: {
                    element: {
                      types: { anyOf: ['shared-utils', 'shared', 'platform'] },
                    },
                  },
                },
                {
                  to: {
                    element: {
                      type: 'feature',
                      captured: {
                        featureName: '{{from.captured.featureName}}',
                      },
                    },
                  },
                },
              ],
            },
            {
              from: { element: { type: 'shared' } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ['shared-utils', 'shared', 'platform'] },
                  },
                },
              },
            },
            {
              // shared/utils itself: zero-dependency by construction (see
              // typescript-coding's low-coupling rule) - restricted to
              // importing only its own sibling files, never platform, so it
              // can never become the platform-facing half of a cycle.
              from: { element: { type: 'shared-utils' } },
              allow: { to: { element: { type: 'shared-utils' } } },
            },
            {
              from: { element: { type: 'platform' } },
              allow: {
                to: {
                  element: { types: { anyOf: ['platform', 'shared-utils'] } },
                },
              },
            },
          ],
        },
      ],
      'boundaries/no-unknown-dependencies': 'error',
      'boundaries/no-unknown-files': 'error',
    },
  },
  {
    // Test files may additionally reach testing-harness (renderRoute.tsx,
    // kitStates.tsx) - the real provider stack a feature/kit test needs to
    // satisfy invariant 90. Production files in those layers still cannot;
    // this block matches ONLY test files and nothing wider, and its
    // policies differ from the base rule solely by that one addition.
    files: ['src/**/*.test.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { project: './tsconfig.json' } },
      'boundaries/include': ['src/**/*.{ts,tsx}'],
      'boundaries/ignore': ['src/vite-env.d.ts'],
      'boundaries/elements': [
        { type: 'testing-harness', pattern: 'src/app/testing/**' },
        { type: 'app', pattern: 'src/app/**' },
        {
          type: 'feature',
          pattern: 'src/features/*/**',
          capture: ['featureName'],
        },
        { type: 'shared-utils', pattern: 'src/shared/utils/**' },
        { type: 'shared', pattern: 'src/shared/**' },
        { type: 'platform', pattern: 'src/platform/**' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          message:
            '{{from.type}} may not import {{to.type}} ({{dependency.source}})',
          policies: [
            {
              from: { element: { type: 'testing-harness' } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: [
                        'app',
                        'feature',
                        'shared-utils',
                        'shared',
                        'platform',
                        'testing-harness',
                      ],
                    },
                  },
                },
              },
            },
            {
              from: { element: { type: 'app' } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: [
                        'app',
                        'feature',
                        'shared-utils',
                        'shared',
                        'platform',
                        'testing-harness',
                      ],
                    },
                  },
                },
              },
            },
            {
              from: { element: { type: 'feature' } },
              allow: [
                {
                  to: {
                    element: {
                      types: {
                        anyOf: [
                          'shared-utils',
                          'shared',
                          'platform',
                          'testing-harness',
                        ],
                      },
                    },
                  },
                },
                {
                  to: {
                    element: {
                      type: 'feature',
                      captured: {
                        featureName: '{{from.captured.featureName}}',
                      },
                    },
                  },
                },
              ],
            },
            {
              from: { element: { type: 'shared' } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: [
                        'shared-utils',
                        'shared',
                        'platform',
                        'testing-harness',
                      ],
                    },
                  },
                },
              },
            },
            {
              from: { element: { type: 'shared-utils' } },
              allow: { to: { element: { type: 'shared-utils' } } },
            },
            {
              // Platform's own tests additionally reach `shared` for the
              // fakes TECH.md 3.2/6.1 name explicitly (createFakeClock,
              // createFakeRandomness, createFakeTransport live in
              // shared/testing, not platform - a platform module still
              // cannot import shared in production code, which is why this
              // addition sits only in the test-file override, not the base
              // rule above). shared-utils is already allowed in production
              // (see the base rule), listed again here since this block
              // replaces rather than extends it for test files.
              from: { element: { type: 'platform' } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ['platform', 'shared-utils', 'shared'] },
                  },
                },
              },
            },
          ],
        },
      ],
      'boundaries/no-unknown-dependencies': 'error',
      'boundaries/no-unknown-files': 'error',
    },
  },
  {
    // Deep imports past a public entry (invariant 7). boundaries/entry-point
    // is deliberately not used - it also inspects intra-element imports in
    // some configurations, and ARCHITECTURE.md already names
    // no-restricted-imports as the mechanism.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-router',
              importNames: ['redirect', 'redirectDocument'],
              message:
                'redirect/redirectDocument are only permitted inside src/features/auth/guard/** - no other file performs a client-side redirect.',
            },
          ],
          patterns: [...FEATURE_DEEP_IMPORT_PATTERNS, SINKS_IMPORT_PATTERN],
        },
      ],
    },
  },
  {
    // A feature's own files use relative imports freely among themselves -
    // but the sinks ban (invariant 45) still applies inside a feature too,
    // so only the two feature-import groups are dropped here, not the rule.
    files: ['src/features/*/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-router',
              importNames: ['redirect', 'redirectDocument'],
              message:
                'redirect/redirectDocument are only permitted inside src/features/auth/guard/** - no other file performs a client-side redirect.',
            },
            {
              name: 'react-router',
              importNames: ['useRevalidator'],
              message:
                'useRevalidator is only permitted in src/app/ route modules - a feature retries or refreshes through the callback its route hands it, so the route stays the one place that wraps beginInteraction/revalidate/endInteraction.',
            },
          ],
          patterns: [SINKS_IMPORT_PATTERN],
        },
      ],
    },
  },
  {
    // The one place `redirect` is permitted (invariants 84-91): the guard
    // pair throws it to send an unauthenticated visitor to /login or a
    // signed-in one away from it. `redirectDocument` stays banned even
    // here - a full document load is never right for a client-side guard.
    // This block REPLACES rather than merges the rule from the two blocks
    // above (flat config's per-rule behaviour), so it must repeat
    // `patterns: [SINKS_IMPORT_PATTERN]` itself or the sinks ban would
    // silently drop for exactly the directory that handles the credential
    // path.
    files: ['src/features/auth/guard/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-router',
              importNames: ['redirectDocument'],
              message:
                'redirectDocument performs a full document load; use redirect or replace instead.',
            },
          ],
          patterns: [SINKS_IMPORT_PATTERN],
        },
      ],
      // The guard's contract with react-router is to throw the Response
      // redirect()/replace() return - the router catches it specially.
      // Not an error-handling escape hatch, so this override is scoped to
      // the two guard files that do it.
      '@typescript-eslint/only-throw-error': 'off',
    },
  },
  {
    // The one file allowed to construct sinks (invariant 45) - it imports
    // them directly by design, so the ban is off for this file alone.
    files: ['src/platform/observability/createSink.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    // Single-reader rules (section 2.4): each capability is readable from
    // exactly one module, enforced as a lint failure rather than a
    // convention. Overrides below re-enable ONLY the specific identifier
    // each module owns, not the whole rule - so a module that owns `fetch`
    // still can't reach for a raw `setTimeout` undetected.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ENV_SYNTAX,
        SEND_BEACON_SYNTAX,
        IMAGE_SRC_SYNTAX,
        DATE_SYNTAX,
        TELEMETRY_SYNTAX,
      ],
      'no-restricted-globals': [
        'error',
        ...NETWORK_GLOBALS,
        ...CLOCK_GLOBALS,
        ...STORAGE_GLOBALS,
      ],
      'no-restricted-properties': [
        'error',
        ...NETWORK_PROPERTIES,
        ...CLOCK_PROPERTIES,
        ...RANDOMNESS_PROPERTIES,
        ...STORAGE_PROPERTIES,
      ],
    },
  },
  {
    files: ['src/platform/configuration/environment.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        SEND_BEACON_SYNTAX,
        IMAGE_SRC_SYNTAX,
        DATE_SYNTAX,
        TELEMETRY_SYNTAX,
      ],
    },
  },
  {
    // The re-exported `isDevelopmentBuild` constant (environment.ts) does
    // not fold across the module boundary: confirmed empirically that
    // Vite/Rolldown only dead-code-eliminates `import.meta.env.DEV` when
    // it appears literally at the call site, so gating the /__kit route's
    // dynamic import() behind the re-exported constant left a
    // KitRoute-*.js chunk shipping to production regardless of its value
    // (invariant 86b). Reading the Vite-builtin DEV flag directly here,
    // in this one file, is what actually lets the bundler drop the
    // module; this is not a raw `import.meta.env.VITE_*` read, so
    // invariant 13's single-parser guarantee for user-defined
    // configuration is unaffected.
    files: ['src/app/routing/routeDefinitions.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        SEND_BEACON_SYNTAX,
        IMAGE_SRC_SYNTAX,
        DATE_SYNTAX,
        TELEMETRY_SYNTAX,
      ],
    },
  },
  {
    files: ['src/platform/http/createFetchTransport.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...NETWORK_GLOBALS.filter((entry) => entry.name !== 'fetch'),
        ...CLOCK_GLOBALS,
        ...STORAGE_GLOBALS,
      ],
      'no-restricted-properties': [
        'error',
        ...NETWORK_PROPERTIES.filter((entry) => entry.property !== 'fetch'),
        ...CLOCK_PROPERTIES,
        ...RANDOMNESS_PROPERTIES,
        ...STORAGE_PROPERTIES,
      ],
    },
  },
  {
    // The one module allowed to touch sessionStorage (invariant 75) - a
    // narrower ban than phase 1's TECH.md predicted removing the entries
    // outright. fetch/timers stay banned here; only the storage global is
    // filtered, the same shape as the createFetchTransport override above.
    files: ['src/platform/runtime/createTabStorage.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...NETWORK_GLOBALS,
        ...CLOCK_GLOBALS,
        ...STORAGE_GLOBALS.filter((entry) => entry.name !== 'sessionStorage'),
      ],
    },
  },
  {
    files: ['src/platform/runtime/createSystemClock.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ENV_SYNTAX,
        SEND_BEACON_SYNTAX,
        IMAGE_SRC_SYNTAX,
        TELEMETRY_SYNTAX,
      ],
      'no-restricted-globals': [
        'error',
        ...NETWORK_GLOBALS,
        ...STORAGE_GLOBALS,
      ],
      'no-restricted-properties': [
        'error',
        ...NETWORK_PROPERTIES,
        ...RANDOMNESS_PROPERTIES,
        ...STORAGE_PROPERTIES,
      ],
    },
  },
  {
    files: ['src/platform/runtime/createSystemRandomness.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        ...NETWORK_PROPERTIES,
        ...CLOCK_PROPERTIES,
        ...STORAGE_PROPERTIES,
      ],
    },
  },
  {
    files: ['src/app/composition/createRuntime.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ENV_SYNTAX,
        SEND_BEACON_SYNTAX,
        IMAGE_SRC_SYNTAX,
        DATE_SYNTAX,
      ],
    },
  },
  {
    // The tests that assert createRuntime.ts's attach/no-attach behavior
    // and bootstrap.ts's end-to-end router wiring have to read the same
    // global the production code writes - narrower than exempting every
    // test file, which would let an unrelated test read the handle
    // undetected.
    files: [
      'src/app/composition/createRuntime.test.ts',
      'src/app/bootstrap.test.tsx',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        ENV_SYNTAX,
        SEND_BEACON_SYNTAX,
        IMAGE_SRC_SYNTAX,
        DATE_SYNTAX,
      ],
    },
  },
  // Applied last so no formatting rule is owned by both ESLint and Prettier.
  eslintConfigPrettier,
]);
