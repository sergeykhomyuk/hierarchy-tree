import { afterEach, beforeEach, expect } from 'vitest';
import { missingKeyReports } from '@platform/internationalization';

if (typeof document !== 'undefined') {
  await import('@testing-library/jest-dom/vitest');
  // @testing-library/react has no /vitest auto-cleanup entry (unlike
  // jest-dom above) - without this, DOM nodes from one test's render()
  // leak into the next test in the same file.
  const { cleanup } = await import('@testing-library/react');
  afterEach(cleanup);
}

globalThis.fetch = (() => {
  throw new Error('network access is not allowed in unit tests');
}) as typeof fetch;

beforeEach(() => {
  missingKeyReports.length = 0;
});

afterEach(() => {
  expect(missingKeyReports).toEqual([]);
});
