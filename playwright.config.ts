import { defineConfig, devices } from '@playwright/test';

const isDeployedRun = Boolean(process.env.DEPLOYED_BASE_URL);

// --host 127.0.0.1 pins the server to the exact address this config
// probes and every baseURL below points at. Without it, Vite binds
// `localhost`, which some environments resolve to the IPv6 loopback
// (::1) - a real address the server IS listening on, but not the IPv4
// one Playwright's webServer readiness check and every request target,
// so the check times out against a server that is actually up.
const previewServer = {
  command: 'npm run preview -- --port 4173 --host 127.0.0.1',
  url: 'http://127.0.0.1:4173/',
  reuseExistingServer: !process.env.CI,
};

const developmentServer = {
  command: 'npm run dev -- --port 4174 --host 127.0.0.1',
  url: 'http://127.0.0.1:4174/',
  reuseExistingServer: !process.env.CI,
};

// Both the webServer array and the projects array are config-level in
// Playwright - there is no per-project webServer, so the deployed run
// (a live URL, no local server, only deployed-smoke.spec.ts) and the local
// run (two servers, everything else) are mutually exclusive branches rather
// than one project list filtered per invocation.
const chromiumProject = {
  name: 'chromium',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4173/',
    locale: 'zxx',
  },
  testDir: './e2e',
  testIgnore: [
    '**/development-console.spec.ts',
    '**/kit-route.spec.ts',
    '**/deployed-smoke.spec.ts',
  ],
};

const developmentProject = {
  name: 'development',
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4174/' },
  testDir: './e2e',
  testMatch: ['**/development-console.spec.ts', '**/kit-route.spec.ts'],
};

const deployedProject = {
  name: 'deployed',
  use: { ...devices['Desktop Chrome'], baseURL: process.env.DEPLOYED_BASE_URL },
  testDir: './e2e',
  testMatch: ['**/deployed-smoke.spec.ts'],
};

export default defineConfig({
  testDir: './e2e',
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
  use: { trace: 'on-first-retry' },
  webServer: isDeployedRun ? [] : [previewServer, developmentServer],
  projects: isDeployedRun
    ? [deployedProject]
    : [chromiumProject, developmentProject],
});
