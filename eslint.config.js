import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';
import eslintConfigPrettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
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
  // Applied last so no formatting rule is owned by both ESLint and Prettier.
  eslintConfigPrettier,
]);
