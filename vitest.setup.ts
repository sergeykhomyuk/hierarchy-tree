if (typeof document !== 'undefined') {
  await import('@testing-library/jest-dom/vitest');
}

globalThis.fetch = (() => {
  throw new Error('network access is not allowed in unit tests');
}) as typeof fetch;
