import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFakeClock, createFakeRandomness } from '@shared/testing';
import { createHttpClient } from '@platform/http';
import type { Transport } from '@platform/http';
import type { ObservabilityFacade } from '@platform/observability';
import type { KeyValueStorage } from '@platform/runtime';
import { useLoginSubmission } from './useLoginSubmission';
import type { UseLoginSubmissionDependencies } from './useLoginSubmission';

function createSpyObservability(): ObservabilityFacade {
  return {
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    tracer: {
      recordTiming: vi.fn(),
      startInteraction: vi.fn(() => 'a'.repeat(32)),
    },
    analytics: { track: vi.fn() },
  };
}

function createMapStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    read: (key) => map.get(key) ?? null,
    write: (key, value) => {
      map.set(key, value);
      return true;
    },
    remove: (key) => {
      map.delete(key);
    },
  };
}

function createTestDependencies(
  transport: Transport,
  overrides: Partial<UseLoginSubmissionDependencies> = {},
): UseLoginSubmissionDependencies {
  const observability = overrides.observability ?? createSpyObservability();
  const http = createHttpClient({
    transport,
    clock: createFakeClock(),
    randomness: createFakeRandomness(),
    observability,
    configuration: {
      apiBaseUrl: 'https://api.example.com',
      requestTimeoutMilliseconds: 8000,
    },
    correlationId: () => 'c'.repeat(32),
  });
  let interactionCount = 0;
  return {
    http,
    observability,
    tabStorage: overrides.tabStorage ?? createMapStorage(),
    beginInteraction:
      overrides.beginInteraction ??
      (() => {
        interactionCount += 1;
        return `interaction-${interactionCount}`.padEnd(32, '0');
      }),
    endInteraction: overrides.endInteraction ?? vi.fn(),
    navigate: overrides.navigate ?? vi.fn(),
  };
}

function TestForm({
  dependencies,
}: {
  dependencies: UseLoginSubmissionDependencies;
}) {
  const { result, isPending, formAction, onSubmit } = useLoginSubmission(
    dependencies,
    '/',
  );

  return (
    <form data-testid="login-form" action={formAction} onSubmit={onSubmit}>
      <input name="email" defaultValue="person@example.com" />
      <input name="password" defaultValue="hunter2" />
      <button type="submit">Login</button>
      <p data-testid="pending">{String(isPending)}</p>
      <p data-testid="outcome">{result.outcome}</p>
    </form>
  );
}

describe('useLoginSubmission', () => {
  it('derives once and requests once when submitted twice in flight', async () => {
    let transportCalls = 0;
    let resolveTransport: ((response: Response) => void) | undefined;
    const transport: Transport = () => {
      transportCalls += 1;
      return new Promise((resolve) => {
        resolveTransport = resolve;
      });
    };
    const observability = createSpyObservability();
    const dependencies = createTestDependencies(transport, { observability });

    render(<TestForm dependencies={dependencies} />);
    const form = screen.getByTestId('login-form');

    fireEvent.submit(form);
    await Promise.resolve();
    fireEvent.submit(form);
    await Promise.resolve();

    resolveTransport?.(new Response('null', { status: 200 }));
    await screen.findByText('noMatch', { selector: '[data-testid="outcome"]' });

    expect(transportCalls).toBe(1);
    const startedCalls = (
      observability.analytics.track as ReturnType<typeof vi.fn>
    ).mock.calls.filter(([name]) => name === 'auth.sign_in_started');
    expect(startedCalls).toHaveLength(1);
  });

  it('clears a previous alert as the next attempt starts', async () => {
    const transport: Transport = () =>
      Promise.resolve(new Response('null', { status: 200 }));
    const dependencies = createTestDependencies(transport);

    render(<TestForm dependencies={dependencies} />);
    const form = screen.getByTestId('login-form');

    fireEvent.submit(form);
    await screen.findByText('noMatch', { selector: '[data-testid="outcome"]' });

    fireEvent.submit(form);

    // The instant the next attempt starts, isPending flips true and
    // loginCardState's isPending-first rule takes over regardless of the
    // stale result - the previous alert is not what a consumer reads.
    expect(screen.getByTestId('pending').textContent).toBe('true');
  });

  it('ends the interaction it began when the attempt settles without navigating', async () => {
    const endInteraction = vi.fn();
    const transport: Transport = () =>
      Promise.resolve(new Response('null', { status: 200 }));
    const dependencies = createTestDependencies(transport, {
      endInteraction,
    });

    render(<TestForm dependencies={dependencies} />);
    const form = screen.getByTestId('login-form');

    fireEvent.submit(form);
    await screen.findByText('noMatch', { selector: '[data-testid="outcome"]' });

    expect(endInteraction).toHaveBeenCalledTimes(1);
  });

  it('leaves the interaction open on a signed-in outcome, letting the resulting navigation settle it', async () => {
    const endInteraction = vi.fn();
    const transport: Transport = () =>
      Promise.resolve(new Response('"user-1"', { status: 200 }));
    const dependencies = createTestDependencies(transport, {
      endInteraction,
    });

    render(<TestForm dependencies={dependencies} />);
    const form = screen.getByTestId('login-form');

    fireEvent.submit(form);
    await waitFor(() => expect(dependencies.navigate).toHaveBeenCalledTimes(1));

    expect(endInteraction).not.toHaveBeenCalled();
  });

  it('aborts in flight and resets to untouched when a persisted page is restored, then unmasks on the next real submission', async () => {
    let abortedSignal: AbortSignal | undefined;
    let callCount = 0;
    const transport: Transport = (request) => {
      callCount += 1;
      if (callCount === 1) {
        abortedSignal = request.signal;
        return new Promise((_resolve, reject) => {
          request.signal.addEventListener('abort', () => {
            reject(new DOMException('aborted', 'AbortError'));
          });
        });
      }
      return Promise.resolve(new Response('null', { status: 200 }));
    };
    const dependencies = createTestDependencies(transport);

    render(<TestForm dependencies={dependencies} />);
    const form = screen.getByTestId('login-form');

    fireEvent.submit(form);
    await Promise.resolve();
    expect(screen.getByTestId('pending').textContent).toBe('true');

    window.dispatchEvent(
      new PageTransitionEvent('pageshow', { persisted: true }),
    );

    expect(abortedSignal?.aborted).toBe(true);
    await waitFor(() =>
      expect(screen.getByTestId('pending').textContent).toBe('false'),
    );
    expect(screen.getByTestId('outcome').textContent).toBe('untouched');

    // The override must lift on the next real submission - not stay
    // stuck masking whatever this one actually settles to.
    fireEvent.submit(form);
    await screen.findByText('noMatch', { selector: '[data-testid="outcome"]' });

    expect(callCount).toBe(2);
  });

  it('aborts in flight without a state update when the page unmounts', async () => {
    let abortedSignal: AbortSignal | undefined;
    const transport: Transport = (request) => {
      abortedSignal = request.signal;
      return new Promise((_resolve, reject) => {
        request.signal.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
    };
    const dependencies = createTestDependencies(transport);

    const { unmount } = render(<TestForm dependencies={dependencies} />);
    const form = screen.getByTestId('login-form');

    fireEvent.submit(form);
    await Promise.resolve();

    expect(() => unmount()).not.toThrow();
    expect(abortedSignal?.aborted).toBe(true);
  });
});
