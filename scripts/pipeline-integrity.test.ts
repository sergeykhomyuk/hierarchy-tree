import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

// The thresholds phase 1 set (specs/phase-1-setup/TECH.md:755-757,
// carried unchanged into vitest.config.ts every phase since) - the floor
// this phase must not have lowered, per invariant 194.
const PHASE_1_THRESHOLDS = {
  lines: 85,
  branches: 85,
  functions: 85,
  domain: { lines: 100, branches: 100, functions: 100, statements: 100 },
};

type WorkflowStep = {
  name?: string;
  run?: string;
  uses?: string;
  if?: unknown;
  'continue-on-error'?: unknown;
};
type WorkflowJob = { steps?: WorkflowStep[] };
type Workflow = { jobs?: Record<string, WorkflowJob> };

describe('pipeline integrity', () => {
  it('no pipeline check is disabled, skipped or set to continue-on-error', () => {
    const workflow = parse(
      readFileSync('.github/workflows/ci.yml', 'utf-8'),
    ) as Workflow;
    const jobs = workflow.jobs ?? {};
    expect(Object.keys(jobs).length).toBeGreaterThan(0);

    const violations: string[] = [];
    for (const [jobName, job] of Object.entries(jobs)) {
      for (const step of job.steps ?? []) {
        const label = step.name ?? step.run ?? step.uses ?? '(unnamed step)';
        if (step['continue-on-error'] === true) {
          violations.push(`${jobName} / ${label}: continue-on-error: true`);
        }
        if (step.if === false || step.if === 'false') {
          violations.push(`${jobName} / ${label}: if: false`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('no coverage threshold is lower than the phase 1 pipeline set', async () => {
    const config = (await import('../vitest.config.ts')).default as {
      test?: {
        coverage?: {
          thresholds?: {
            lines?: number;
            branches?: number;
            functions?: number;
            'src/features/*/domain/**'?: {
              lines?: number;
              branches?: number;
              functions?: number;
              statements?: number;
            };
          };
        };
      };
    };
    const thresholds = config.test?.coverage?.thresholds;
    expect(
      thresholds,
      'vitest.config.ts has no coverage thresholds',
    ).toBeDefined();

    expect(thresholds?.lines ?? 0).toBeGreaterThanOrEqual(
      PHASE_1_THRESHOLDS.lines,
    );
    expect(thresholds?.branches ?? 0).toBeGreaterThanOrEqual(
      PHASE_1_THRESHOLDS.branches,
    );
    expect(thresholds?.functions ?? 0).toBeGreaterThanOrEqual(
      PHASE_1_THRESHOLDS.functions,
    );

    const domain = thresholds?.['src/features/*/domain/**'];
    expect(domain, 'the domain 100% threshold entry is missing').toBeDefined();
    expect(domain?.lines ?? 0).toBeGreaterThanOrEqual(
      PHASE_1_THRESHOLDS.domain.lines,
    );
    expect(domain?.branches ?? 0).toBeGreaterThanOrEqual(
      PHASE_1_THRESHOLDS.domain.branches,
    );
    expect(domain?.functions ?? 0).toBeGreaterThanOrEqual(
      PHASE_1_THRESHOLDS.domain.functions,
    );
    expect(domain?.statements ?? 0).toBeGreaterThanOrEqual(
      PHASE_1_THRESHOLDS.domain.statements,
    );
  });
});
