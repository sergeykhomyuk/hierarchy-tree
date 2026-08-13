import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RuntimeContext } from './runtimeContext';
import { useRuntime } from './useRuntime';
import type { Runtime } from './createRuntime';

function ReadRuntime({ field }: { field: 'apiBaseUrl' }) {
  const runtime = useRuntime();
  return <output>{runtime.configuration[field]}</output>;
}

describe('useRuntime', () => {
  it('throws when read outside a RuntimeContext provider', () => {
    // React logs this thrown-during-render error via console.error; the
    // assertion is on the throw itself, not on console output.
    expect(() => render(<ReadRuntime field="apiBaseUrl" />)).toThrow(
      /RuntimeContext/,
    );
  });

  it('returns the provided runtime when read inside a provider', () => {
    const runtime = { configuration: { apiBaseUrl: 'https://example.test' } };

    render(
      <RuntimeContext.Provider value={runtime as unknown as Runtime}>
        <ReadRuntime field="apiBaseUrl" />
      </RuntimeContext.Provider>,
    );

    expect(screen.getByText('https://example.test')).toBeInTheDocument();
  });
});
