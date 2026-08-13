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

export default defineConfig([
  globalIgnores(['dist']),
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
    files: ['src/**/*.test.{ts,tsx}'],
    extends: [testingLibrary.configs['flat/react']],
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
                  to: { element: { types: { anyOf: ['shared', 'platform'] } } },
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
                to: { element: { types: { anyOf: ['shared', 'platform'] } } },
              },
            },
            {
              from: { element: { type: 'platform' } },
              allow: { to: { element: { type: 'platform' } } },
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
                        anyOf: ['shared', 'platform', 'testing-harness'],
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
                    types: { anyOf: ['shared', 'platform', 'testing-harness'] },
                  },
                },
              },
            },
            {
              from: { element: { type: 'platform' } },
              allow: { to: { element: { type: 'platform' } } },
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
          patterns: [
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
            {
              group: [
                '@platform/observability/sinks/*',
                '**/observability/sinks/*',
              ],
              message:
                'Sinks are constructed only by platform/observability/createObservability.ts.',
            },
          ],
        },
      ],
    },
  },
  {
    // A feature's own files use relative imports freely among themselves.
    files: ['src/features/*/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    // Single-reader rules (section 2.4): each capability is readable from
    // exactly one module, enforced as a lint failure rather than a
    // convention. Overrides below re-enable the banned identifier only in
    // that one module.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'MemberExpression[object.type="MetaProperty"][object.meta.name="import"][object.property.name="meta"][property.name="env"]',
          message:
            'Read the environment only in src/platform/configuration/environment.ts.',
        },
        {
          selector: 'MemberExpression[property.name="sendBeacon"]',
          message:
            'Use the http client. Only platform/http/createFetchTransport.ts calls fetch.',
        },
        {
          selector: 'NewExpression[callee.name="Date"][arguments.length=0]',
          message:
            'Inject Clock.now() instead of `new Date()`. Only createSystemClock.ts may call it.',
        },
        {
          selector:
            'MemberExpression[property.name="__hierarchyTreeTelemetry"]',
          message:
            'The telemetry handle is attached only by app/composition/createRuntime.ts.',
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message:
            'Use the http client. Only platform/http/createFetchTransport.ts calls fetch.',
        },
        {
          name: 'XMLHttpRequest',
          message:
            'Use the http client. Only platform/http/createFetchTransport.ts calls fetch.',
        },
        {
          name: 'WebSocket',
          message:
            'Use the http client. Only platform/http/createFetchTransport.ts calls fetch.',
        },
        {
          name: 'EventSource',
          message:
            'Use the http client. Only platform/http/createFetchTransport.ts calls fetch.',
        },
        {
          name: 'setTimeout',
          message:
            'Inject Clock instead. Only createSystemClock.ts may call this.',
        },
        {
          name: 'setInterval',
          message:
            'Inject Clock instead. Only createSystemClock.ts may call this.',
        },
        {
          name: 'requestAnimationFrame',
          message:
            'Inject Clock instead. Only createSystemClock.ts may call this.',
        },
        {
          name: 'localStorage',
          message:
            'Nothing in this phase persists anything. See invariant 128.',
        },
        {
          name: 'sessionStorage',
          message:
            'Nothing in this phase persists anything. See invariant 128.',
        },
        {
          name: 'indexedDB',
          message:
            'Nothing in this phase persists anything. See invariant 128.',
        },
        {
          name: 'caches',
          message:
            'Nothing in this phase persists anything. See invariant 128.',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'window',
          property: 'fetch',
          message:
            'Use the http client. Only platform/http/createFetchTransport.ts calls fetch.',
        },
        {
          object: 'navigator',
          property: 'sendBeacon',
          message:
            'Use the http client. Only platform/http/createFetchTransport.ts calls fetch.',
        },
        {
          object: 'Date',
          property: 'now',
          message:
            'Inject Clock.now() instead. Only createSystemClock.ts may call this.',
        },
        {
          object: 'Math',
          property: 'random',
          message:
            'Inject Randomness instead. Only createSystemRandomness.ts may call this.',
        },
        {
          object: 'performance',
          property: 'now',
          message:
            'Inject Clock.now() instead. Only createSystemClock.ts may call this.',
        },
        {
          object: 'crypto',
          property: 'getRandomValues',
          message:
            'Inject Randomness instead. Only createSystemRandomness.ts may call this.',
        },
        {
          object: 'window',
          property: 'localStorage',
          message:
            'Nothing in this phase persists anything. See invariant 128.',
        },
        {
          object: 'window',
          property: 'sessionStorage',
          message:
            'Nothing in this phase persists anything. See invariant 128.',
        },
        {
          object: 'window',
          property: 'indexedDB',
          message:
            'Nothing in this phase persists anything. See invariant 128.',
        },
        {
          object: 'window',
          property: 'caches',
          message:
            'Nothing in this phase persists anything. See invariant 128.',
        },
        {
          object: 'window',
          property: 'serviceWorker',
          message:
            'Nothing in this phase persists anything. See invariant 128.',
        },
        {
          object: 'globalThis',
          property: 'localStorage',
          message:
            'Nothing in this phase persists anything. See invariant 128.',
        },
        {
          object: 'globalThis',
          property: 'sessionStorage',
          message:
            'Nothing in this phase persists anything. See invariant 128.',
        },
        {
          object: 'globalThis',
          property: 'indexedDB',
          message:
            'Nothing in this phase persists anything. See invariant 128.',
        },
        {
          object: 'globalThis',
          property: 'caches',
          message:
            'Nothing in this phase persists anything. See invariant 128.',
        },
        {
          object: 'globalThis',
          property: 'serviceWorker',
          message:
            'Nothing in this phase persists anything. See invariant 128.',
        },
        {
          object: 'navigator',
          property: 'localStorage',
          message:
            'Nothing in this phase persists anything. See invariant 128.',
        },
        {
          object: 'navigator',
          property: 'sessionStorage',
          message:
            'Nothing in this phase persists anything. See invariant 128.',
        },
        {
          object: 'navigator',
          property: 'indexedDB',
          message:
            'Nothing in this phase persists anything. See invariant 128.',
        },
        {
          object: 'navigator',
          property: 'caches',
          message:
            'Nothing in this phase persists anything. See invariant 128.',
        },
        {
          object: 'navigator',
          property: 'serviceWorker',
          message:
            'Nothing in this phase persists anything. See invariant 128.',
        },
      ],
    },
  },
  {
    files: ['src/platform/configuration/environment.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['src/platform/http/createFetchTransport.ts'],
    rules: {
      'no-restricted-syntax': 'off',
      'no-restricted-globals': 'off',
      'no-restricted-properties': 'off',
    },
  },
  {
    files: [
      'src/platform/runtime/createSystemClock.ts',
      'src/platform/runtime/createSystemRandomness.ts',
    ],
    rules: {
      'no-restricted-syntax': 'off',
      'no-restricted-globals': 'off',
      'no-restricted-properties': 'off',
    },
  },
  {
    files: ['src/app/composition/createRuntime.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  // Applied last so no formatting rule is owned by both ESLint and Prettier.
  eslintConfigPrettier,
]);
