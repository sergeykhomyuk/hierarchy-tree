import { afterEach, beforeEach, expect } from 'vitest';
import { missingKeyReports } from '@platform/internationalization';

if (typeof document !== 'undefined') {
  await import('@testing-library/jest-dom/vitest');
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
