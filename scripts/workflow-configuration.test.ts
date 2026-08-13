import { globSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

const GATING_STEPS_IN_ORDER = [
  'npm run typecheck',
  'npm run lint',
  'npm run format:check',
  'npm run test:coverage',
  'npm run build',
  'npm run verify:build',
  'npm run size',
];

const INFRASTRUCTURE_ALLOW_LIST = [
  'npm ci',
  'npx playwright install --with-deps chromium',
  'echo "version=$(node -p "require(\'./package-lock.json\').packages[\'node_modules/@playwright/test\'].version")" >> "$GITHUB_OUTPUT"',
];

type WorkflowStep = {
  name?: string;
  run?: string;
  uses?: string;
  id?: string;
  if?: unknown;
  'continue-on-error'?: unknown;
  with?: Record<string, unknown>;
};

type WorkflowJob = {
  'runs-on'?: string;
  needs?: string | string[];
  if?: unknown;
  permissions?: Record<string, unknown>;
  concurrency?: { group?: string; 'cancel-in-progress'?: unknown };
  steps?: WorkflowStep[];
};

type Workflow = {
  on?: Record<string, unknown>;
  concurrency?: { group?: string; 'cancel-in-progress'?: unknown };
  jobs?: Record<string, WorkflowJob>;
};

function readWorkflow(): Workflow {
  return parse(readFileSync('.github/workflows/ci.yml', 'utf-8')) as Workflow;
}

function step(job: WorkflowJob, predicate: (s: WorkflowStep) => boolean) {
  return (job.steps ?? []).find(predicate);
}

describe('CI workflow', () => {
  it('parses as valid YAML with the three named jobs', () => {
    const workflow = readWorkflow();

    expect(Object.keys(workflow.jobs ?? {}).sort()).toEqual([
      'deploy',
      'live-smoke',
      'verify',
    ]);
  });

  it('triggers on pull_request and push to main, with a top-level concurrency group keyed by ref', () => {
    const workflow = readWorkflow();

    expect(workflow.on).toHaveProperty('pull_request');
    expect(workflow.on).toHaveProperty('push');
    expect(
      (workflow.on as { push?: { branches?: string[] } }).push?.branches,
    ).toEqual(['main']);
    expect(workflow.concurrency?.group).toBe('ci-${{ github.ref }}');
    expect(workflow.concurrency?.['cancel-in-progress']).toBe(true);
  });

  describe('verify job', () => {
    it('carries no more than read access to repository contents', () => {
      const job = readWorkflow().jobs?.verify;

      expect(job?.permissions).toEqual({ contents: 'read' });
    });

    it('checks out, sets up Node from .nvmrc with npm caching, and runs npm ci', () => {
      const job = readWorkflow().jobs?.verify;
      const steps = job?.steps ?? [];

      expect(steps.some((s) => s.uses?.startsWith('actions/checkout@'))).toBe(
        true,
      );
      const setupNode = steps.find((s) =>
        s.uses?.startsWith('actions/setup-node@'),
      );
      expect(setupNode?.with?.['node-version-file']).toBe('.nvmrc');
      expect(setupNode?.with?.cache).toBe('npm');
      expect(steps.some((s) => s.run === 'npm ci')).toBe(true);
    });

    it('runs the seven gating steps in the documented order', () => {
      const job = readWorkflow().jobs?.verify;
      const runLines = (job?.steps ?? [])
        .map((s) => s.run)
        .filter((run): run is string => run !== undefined);

      const gatingIndices = GATING_STEPS_IN_ORDER.map((command) =>
        runLines.indexOf(command),
      );

      expect(gatingIndices.every((index) => index >= 0)).toBe(true);
      expect(gatingIndices).toEqual([...gatingIndices].sort((a, b) => a - b));
    });

    it('every run: line in the verify job is a gating step, an npm script, or the named infrastructure allow-list', () => {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf-8')) as {
        scripts: Record<string, string>;
      };
      const knownNpmScripts = Object.keys(packageJson.scripts).map(
        (name) => `npm run ${name}`,
      );

      const job = readWorkflow().jobs?.verify;
      const runLines = (job?.steps ?? [])
        .map((s) => s.run)
        .filter((run): run is string => run !== undefined);

      for (const line of runLines) {
        expect(
          knownNpmScripts.includes(line) ||
            INFRASTRUCTURE_ALLOW_LIST.includes(line),
          `unexpected run: line "${line}" - not a known npm script or an allow-listed infrastructure command`,
        ).toBe(true);
      }
    });

    it('caches the Playwright browsers before installing them', () => {
      const job = readWorkflow().jobs?.verify;
      const steps = job?.steps ?? [];

      const cacheIndex = steps.findIndex((s) =>
        s.uses?.startsWith('actions/cache@'),
      );
      const installIndex = steps.findIndex(
        (s) => s.run === 'npx playwright install --with-deps chromium',
      );

      expect(cacheIndex).toBeGreaterThanOrEqual(0);
      expect(installIndex).toBeGreaterThan(cacheIndex);
    });

    it('uploads the site artifact from dist/, only on main, before the e2e step', () => {
      const job = readWorkflow().jobs?.verify;
      const steps = job?.steps ?? [];

      const uploadIndex = steps.findIndex(
        (s) =>
          s.uses?.startsWith('actions/upload-artifact@') &&
          s.with?.name === 'site',
      );
      const e2eIndex = steps.findIndex((s) => s.run === 'npm run e2e');
      const uploadStep = steps[uploadIndex];

      expect(uploadIndex).toBeGreaterThanOrEqual(0);
      expect(e2eIndex).toBeGreaterThan(uploadIndex);
      expect(uploadStep?.with?.path).toBe('dist/');
      expect(uploadStep?.if).toBe("github.ref == 'refs/heads/main'");
    });

    it('uploads the Playwright report unconditionally, even on failure', () => {
      const job = readWorkflow().jobs?.verify;
      const reportUpload = step(
        job as WorkflowJob,
        (s) =>
          s.uses?.startsWith('actions/upload-artifact@') === true &&
          s.with?.name === 'playwright-report',
      );

      expect(reportUpload?.if).toBe('always()');
    });

    it('no verify step skips itself with continue-on-error, if: false, or a skip flag', () => {
      const job = readWorkflow().jobs?.verify;
      const steps = job?.steps ?? [];

      for (const s of steps) {
        expect(s['continue-on-error']).not.toBe(true);
        expect(s.if).not.toBe(false);
        expect(s.if).not.toBe('false');
      }
    });
  });

  describe('deploy job', () => {
    it('needs verify, runs only on push to main, and carries the smallest permission set', () => {
      const job = readWorkflow().jobs?.deploy;

      expect(job?.needs).toBe('verify');
      expect(job?.if).toBe(
        "github.event_name == 'push' && github.ref == 'refs/heads/main'",
      );
      expect(job?.permissions).toEqual({ contents: 'read' });
    });

    it('has its own concurrency group so a newer deploy supersedes an in-flight one', () => {
      const job = readWorkflow().jobs?.deploy;

      expect(job?.concurrency?.group).toBe('cloudflare-pages-deploy');
      expect(job?.concurrency?.['cancel-in-progress']).toBe(true);
    });

    it('checks out only deployment.json via sparse-checkout, and downloads the site artifact rather than rebuilding', () => {
      const job = readWorkflow().jobs?.deploy;
      const steps = job?.steps ?? [];

      const checkoutStep = steps.find((s) =>
        s.uses?.startsWith('actions/checkout@'),
      );
      expect(checkoutStep?.with?.['sparse-checkout']).toBe('deployment.json');

      expect(
        steps.some((s) => s.uses?.startsWith('actions/download-artifact@')),
      ).toBe(true);

      // The deploy job's run: lines aren't allow-listed the way verify's
      // are (TECH.md ties 102's command rule to the gating job alone) -
      // the one thing that must hold is that none of them is a build,
      // which would ship bytes nothing in `verify` had inspected.
      const runLines = steps
        .map((s) => s.run)
        .filter((run): run is string => run !== undefined);
      for (const line of runLines) {
        expect(line).not.toMatch(/\bnpm run build\b|\bvite build\b/);
      }
    });

    it('deploys with the wrangler action, SHA-pinned rather than tagged, reading projectName from deployment.json', () => {
      const job = readWorkflow().jobs?.deploy;
      const steps = job?.steps ?? [];

      const wranglerStep = steps.find((s) =>
        s.uses?.startsWith('cloudflare/wrangler-action@'),
      );
      const ref = wranglerStep?.uses?.split('@')[1];

      expect(ref).toMatch(/^[0-9a-f]{40}$/);
      expect(wranglerStep?.with?.command).toContain(
        '${{ steps.deployment.outputs.projectName }}',
      );
    });

    it('asserts the deployed URL equals the recorded production hostname', () => {
      const job = readWorkflow().jobs?.deploy;
      const steps = job?.steps ?? [];
      const assertionStep = steps[steps.length - 1];

      expect(assertionStep?.run).toContain(
        'steps.deploy.outputs.deployment-url',
      );
      expect(assertionStep?.run).toContain(
        'steps.deployment.outputs.productionHostname',
      );
    });

    it('every non-actions/ uses: step is pinned by commit SHA, not a mutable tag', () => {
      const job = readWorkflow().jobs?.deploy;
      const steps = job?.steps ?? [];

      for (const s of steps) {
        if (s.uses === undefined) continue;
        const [owner, ref] = s.uses.split('@');
        if (owner?.startsWith('actions/')) continue;
        expect(
          ref,
          `${s.uses} must be pinned by commit SHA, not a mutable tag`,
        ).toMatch(/^[0-9a-f]{40}$/);
      }
    });
  });

  describe('live-smoke job', () => {
    it('carries no more than read access to repository contents', () => {
      const job = readWorkflow().jobs?.['live-smoke'];

      expect(job?.permissions).toEqual({ contents: 'read' });
    });

    it('runs only when manually dispatched, and blocks no merge', () => {
      const workflow = readWorkflow();

      // `on:` is workflow-level in GitHub Actions - there is no per-job
      // trigger - so workflow_dispatch has to be one of the workflow's
      // triggers, and the job itself is gated to that event alone with
      // its own `if:`.
      expect(workflow.on).toHaveProperty('workflow_dispatch');
      expect(workflow.jobs?.['live-smoke']?.if).toBe(
        "github.event_name == 'workflow_dispatch'",
      );

      const jobs = Object.entries(workflow.jobs ?? {});
      for (const [name, job] of jobs) {
        if (name === 'live-smoke') continue;
        const needs = Array.isArray(job.needs)
          ? job.needs
          : job.needs
            ? [job.needs]
            : [];
        expect(needs).not.toContain('live-smoke');
      }
    });

    it('runs npm run smoke:live', () => {
      const job = readWorkflow().jobs?.['live-smoke'];
      const steps = job?.steps ?? [];

      expect(steps.some((s) => s.run === 'npm run smoke:live')).toBe(true);
    });
  });
});

describe('no disabled tests', () => {
  it('src and e2e contain no .skip, .only, or test.fixme', () => {
    const sourceFiles = globSync('src/**/*.{ts,tsx}');
    const e2eFiles = globSync('e2e/**/*.ts');
    const disabledTestPattern = /\.(skip|only)\s*\(|test\.fixme\s*\(/;

    for (const filePath of [...sourceFiles, ...e2eFiles]) {
      const content = readFileSync(filePath, 'utf-8');
      expect(
        disabledTestPattern.test(content),
        `${filePath} contains .skip, .only, or test.fixme`,
      ).toBe(false);
    }
  });
});
