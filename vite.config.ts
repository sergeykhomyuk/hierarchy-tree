import path from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import * as z from 'zod/mini';
import {
  buildContentSecurityPolicy,
  type CspMode,
} from './scripts/buildContentSecurityPolicy.js';

const DEFAULT_API_BASE_URL = 'https://gongfetest.firebaseio.com';

// Mirrors configurationSchema.ts's VITE_API_BASE_URL rule (https only) -
// loadEnv() reads the raw string outside src, so this is the one other
// place that value can reach a build artifact (the CSP meta tag), and it
// must be held to the same rule the runtime schema enforces.
const apiBaseUrlSchema = z.url({ protocol: /^https$/ });

export function resolveApiOrigin(rawApiBaseUrl: string): string {
  const parsed = apiBaseUrlSchema.safeParse(rawApiBaseUrl);
  const validatedApiBaseUrl = parsed.success
    ? parsed.data
    : DEFAULT_API_BASE_URL;
  // .origin, not the raw string - buildContentSecurityPolicy() interpolates
  // this directly into a directive, so a value containing e.g. `;` could
  // inject additional directives. A URL's origin can't carry one.
  return new URL(validatedApiBaseUrl).origin;
}

function cspMetaTagPlugin(mode: CspMode, apiBaseUrl: string): Plugin {
  const policy = buildContentSecurityPolicy(mode, apiBaseUrl);

  return {
    name: 'csp-meta-tag',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // A build-time env read via loadEnv, not import.meta.env - outside
  // src, so invariant 13's single-reader rule is untouched.
  const env = loadEnv(mode, process.cwd(), '');
  const apiOrigin = resolveApiOrigin(
    env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL,
  );
  const cspMode: CspMode = command === 'serve' ? 'development' : 'production';

  return {
    plugins: [react(), tailwindcss(), cspMetaTagPlugin(cspMode, apiOrigin)],
    resolve: {
      alias: {
        '@app': path.resolve(import.meta.dirname, './src/app'),
        '@features': path.resolve(import.meta.dirname, './src/features'),
        '@shared': path.resolve(import.meta.dirname, './src/shared'),
        '@platform': path.resolve(import.meta.dirname, './src/platform'),
      },
    },
    build: {
      // Read by build-output/route-chunks.test.ts and catalogue-chunks.test.ts
      // to assert on the CHUNK GRAPH (invariant 62) - which chunk imports
      // which - rather than grepping a chunk's own content for a key that
      // was never inlined there.
      manifest: true,
      rolldownOptions: {
        output: {
          entryFileNames: 'assets/entry-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          codeSplitting: {
            groups: [{ name: 'vendor', test: /node_modules/ }],
          },
        },
      },
    },
  };
});
