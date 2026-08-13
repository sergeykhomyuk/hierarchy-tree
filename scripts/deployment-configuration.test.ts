import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Deployment = { projectName: string; productionHostname: string };

function readDeployment(): Deployment {
  return JSON.parse(readFileSync('deployment.json', 'utf-8')) as Deployment;
}

describe('deployment.json', () => {
  it('carries a project name and an https production hostname', () => {
    const deployment = readDeployment();

    expect(deployment.projectName.length).toBeGreaterThan(0);
    expect(deployment.productionHostname).toMatch(/^https:\/\//);
  });

  it('VERIFICATION.md carries the production-hostname marker, and its value agrees', () => {
    const deployment = readDeployment();
    const verification = readFileSync('VERIFICATION.md', 'utf-8');
    const match = verification.match(/<!-- production-hostname: (.+) -->/);

    expect(
      match,
      'VERIFICATION.md is missing the production-hostname marker',
    ).not.toBeNull();
    expect(match?.[1]).toBe(deployment.productionHostname);
  });

  it('.env.example carries the production-hostname marker, and its value agrees', () => {
    const deployment = readDeployment();
    const envExample = readFileSync('.env.example', 'utf-8');
    const match = envExample.match(/^# production-hostname: (.+)$/m);

    expect(
      match,
      '.env.example is missing the production-hostname marker',
    ).not.toBeNull();
    expect(match?.[1]).toBe(deployment.productionHostname);
  });
});
