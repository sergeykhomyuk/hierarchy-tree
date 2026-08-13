import { run } from 'axe-core';
import { expect } from 'vitest';

async function toHaveNoAxeViolations(container: Element) {
  const results = await run(container);
  const pass = results.violations.length === 0;

  return {
    pass,
    message: () =>
      pass
        ? 'expected the container to have at least one axe violation'
        : `expected no axe violations, found:\n${results.violations
            .map((violation) => `- ${violation.id}: ${violation.description}`)
            .join('\n')}`,
  };
}

expect.extend({ toHaveNoAxeViolations });

declare module 'vitest' {
  interface Assertion {
    toHaveNoAxeViolations: () => Promise<void>;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoAxeViolations: () => void;
  }
}
