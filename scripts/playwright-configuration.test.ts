import { afterEach, describe, expect, it } from 'vitest';

describe('playwright configuration', () => {
  const originalDeployedBaseUrl = process.env.DEPLOYED_BASE_URL;

  afterEach(() => {
    if (originalDeployedBaseUrl === undefined) {
      delete process.env.DEPLOYED_BASE_URL;
    } else {
      process.env.DEPLOYED_BASE_URL = originalDeployedBaseUrl;
    }
  });

  it('the deployed project is absent from the projects array when DEPLOYED_BASE_URL is unset', async () => {
    delete process.env.DEPLOYED_BASE_URL;
    const modulePath = '../playwright.config.ts?deployed-unset';
    const config = (await import(/* @vite-ignore */ modulePath)).default;
    const projectNames = (config.projects ?? []).map(
      (project: { name?: string }) => project.name,
    );

    expect(projectNames).not.toContain('deployed');
  });

  it('no webServer is configured when DEPLOYED_BASE_URL is set', async () => {
    process.env.DEPLOYED_BASE_URL = 'https://example.pages.dev';
    const modulePath = '../playwright.config.ts?deployed-set';
    const config = (await import(/* @vite-ignore */ modulePath)).default;

    expect(config.webServer).toEqual([]);
  });
});
